import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useStore } from "../store/useStore";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { PaymentMethod } from "../types";
import { translations, getLocalizedField } from "../lib/translations";

export function PaymentMethods() {
  const { firebaseUser, language } = useStore();
  const t = translations[language] || translations.en;

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({ name: "", nameAr: "", nameBn: "", type: "cash", color: "#10b981", isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchMethods = async () => {
    if (!firebaseUser) return;
    const q = query(collection(db, "users", firebaseUser.uid, "payment_methods"));
    const snap = await getDocs(q);
    setMethods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
  };

  useEffect(() => {
    fetchMethods();
  }, [firebaseUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !formData.name) return;

    if (editingId) {
      await updateDoc(doc(db, "users", firebaseUser.uid, "payment_methods", editingId), {
        ...formData,
        updatedAt: Date.now(),
      });
    } else {
      await addDoc(collection(db, "users", firebaseUser.uid, "payment_methods"), {
        ...formData,
        updatedAt: Date.now(),
      });
    }
    
    setFormData({ name: "", nameAr: "", nameBn: "", type: "cash", color: "#10b981", isActive: true });
    setEditingId(null);
    fetchMethods();
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingId(method.id!);
    setFormData({
      name: method.name,
      nameAr: method.nameAr || "",
      nameBn: method.nameBn || "",
      type: method.type,
      color: method.color,
      isActive: method.isActive
    });
  };

  const handleDelete = async (id: string) => {
    if (!firebaseUser || !confirm("Are you sure?")) return;
    await deleteDoc(doc(db, "users", firebaseUser.uid, "payment_methods", id));
    fetchMethods();
  };

  return (
    <div className="bento-container shrink-0 min-h-0 h-auto">
      <div className="card col-span-12 md:col-span-4 h-fit">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          {editingId ? t.editPaymentMethod : t.addPaymentMethod}
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
              value={formData.nameAr || ""}
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
              value={formData.nameBn || ""}
              onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">{t.paymentMethodType}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="cash">{t.paymentTypeCash}</option>
              <option value="mada">{t.paymentTypeMada}</option>
              <option value="other">{t.paymentTypeOther}</option>
            </select>
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">{t.paymentActive}</label>
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
                onClick={() => { setEditingId(null); setFormData({ name: "", nameAr: "", nameBn: "", type: "cash", color: "#10b981", isActive: true }); }}
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
                <th className="font-medium p-4">{t.paymentMethodType}</th>
                <th className="font-medium p-4">{t.paymentMethodName}</th>
                <th className="font-medium p-4 text-center">{t.paymentStatus}</th>
                <th className="font-medium p-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {methods.map((method) => (
                <tr key={method.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded shadow-sm border border-slate-200 text-[10px] font-bold tracking-wider animate-pulse-soft" style={{ backgroundColor: `${method.color}20`, color: method.color }}>
                      {method.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    <div className="flex flex-col">
                      <span>{getLocalizedField(method, "name", language)}</span>
                      {method.nameAr && language !== "ar" && <span className="text-[10px] text-slate-400 font-normal">{method.nameAr}</span>}
                      {method.nameBn && language !== "bn" && <span className="text-[10px] text-slate-400 font-normal">{method.nameBn}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${method.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {method.isActive ? t.paymentActive : t.inactive}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleEdit(method)} className="text-slate-500 hover:text-blue-600 p-2 rounded-lg transition-colors mr-1 inline-flex cursor-pointer animate-pulse-soft">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(method.id!)} className="text-slate-500 hover:text-red-600 p-2 rounded-lg transition-colors inline-flex cursor-pointer animate-pulse-soft">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {methods.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">{t.noPaymentMethods}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
