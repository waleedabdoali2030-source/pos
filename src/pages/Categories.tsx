import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useStore } from "../store/useStore";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Category } from "../types";
import { translations, getLocalizedField } from "../lib/translations";

export function Categories() {
  const { firebaseUser, language } = useStore();
  const t = translations[language] || translations.en;

  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({ name: "", nameAr: "", nameBn: "", color: "#e4e4e7" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!firebaseUser) return;
    const q = query(collection(db, "users", firebaseUser.uid, "categories"));
    const snap = await getDocs(q);
    setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
  };

  useEffect(() => {
    fetchCategories();
  }, [firebaseUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !formData.name) return;

    if (editingId) {
      await updateDoc(doc(db, "users", firebaseUser.uid, "categories", editingId), {
        ...formData,
        updatedAt: Date.now(),
      });
    } else {
      await addDoc(collection(db, "users", firebaseUser.uid, "categories"), {
        ...formData,
        updatedAt: Date.now(),
      });
    }
    
    setFormData({ name: "", nameAr: "", nameBn: "", color: "#e4e4e7" });
    setEditingId(null);
    fetchCategories();
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id!);
    setFormData({
      name: cat.name,
      nameAr: cat.nameAr || "",
      nameBn: cat.nameBn || "",
      color: cat.color
    });
  };

  const handleDelete = async (id: string) => {
    if (!firebaseUser || !confirm("Are you sure?")) return;
    await deleteDoc(doc(db, "users", firebaseUser.uid, "categories", id));
    fetchCategories();
  };

  return (
    <div className="bento-container shrink-0 min-h-0 h-auto">
      <div className="card col-span-12 md:col-span-4 h-fit">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          {editingId ? t.editCategory : t.addCategory}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              {t.nameEn} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              {t.nameAr}
            </label>
            <input
              type="text" dir="rtl"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              {t.nameBn}
            </label>
            <input
              type="text"
              value={formData.nameBn}
              onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">{t.categoryColor}</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 px-1 py-1 border border-slate-300 rounded-lg focus:outline-none cursor-pointer"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {editingId ? t.save : t.save}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setFormData({ name: "", nameAr: "", nameBn: "", color: "#e4e4e7" }); }}
                className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                {t.cancel}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card col-span-12 md:col-span-8 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500">
                <th className="font-medium p-4">{t.categoryColor}</th>
                <th className="font-medium p-4">{t.categoryName}</th>
                <th className="font-medium p-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="w-6 h-6 rounded-lg shadow-sm border border-slate-200" style={{ backgroundColor: cat.color }} />
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    <div className="flex flex-col">
                      <span>{getLocalizedField(cat, "name", language)}</span>
                      {cat.nameAr && language !== "ar" && <span className="text-[10px] text-slate-400 font-normal">{cat.nameAr}</span>}
                      {cat.nameBn && language !== "bn" && <span className="text-[10px] text-slate-400 font-normal">{cat.nameBn}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleEdit(cat)} className="text-slate-500 hover:text-blue-600 p-2 rounded-lg transition-colors inline-flex mr-1 cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id!)} className="text-slate-500 hover:text-red-600 p-2 rounded-lg transition-colors inline-flex cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">{t.noCategories}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
