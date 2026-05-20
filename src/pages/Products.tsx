import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useStore } from "../store/useStore";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Product, Category, Setting } from "../types";
import { translations, getLocalizedField } from "../lib/translations";

export function Products() {
  const { firebaseUser, language } = useStore();
  const t = translations[language] || translations.en;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({ name: "", nameAr: "", nameBn: "", categoryId: "", price: 0, barcode: "" });
  const [taxInclusivePrice, setTaxInclusivePrice] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!firebaseUser) return;
    const [pSnap, cSnap, setSnap] = await Promise.all([
      getDocs(query(collection(db, "users", firebaseUser.uid, "products"))),
      getDocs(query(collection(db, "users", firebaseUser.uid, "categories"))),
      getDocs(collection(db, "users", firebaseUser.uid, "settings"))
    ]);
    setProducts(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    setCategories(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    if (!setSnap.empty) {
      setSettings(setSnap.docs[0].data() as Setting);
    }
  };

  const handlePriceExcludingChange = (valStr: string) => {
    setFormData(prev => ({ ...prev, price: valStr as any }));
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0) {
      const taxRate = settings?.taxRate ?? 15;
      const inclusive = val * (1 + taxRate / 100);
      setTaxInclusivePrice(inclusive.toFixed(2));
    } else {
      setTaxInclusivePrice("");
    }
  };

  const handlePriceIncludingChange = (valStr: string) => {
    setTaxInclusivePrice(valStr);
    const val = parseFloat(valStr);
    if (!isNaN(val) && val >= 0) {
      const taxRate = settings?.taxRate ?? 15;
      const exclusive = val / (1 + taxRate / 100);
      setFormData(prev => ({ ...prev, price: Number(exclusive.toFixed(4)) }));
    } else {
      setFormData(prev => ({ ...prev, price: "" as any }));
    }
  };

  useEffect(() => {
    fetchData();
  }, [firebaseUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !formData.name || !formData.categoryId) return;

    if (editingId) {
      await updateDoc(doc(db, "users", firebaseUser.uid, "products", editingId), {
        ...formData,
        price: Number(formData.price),
        updatedAt: Date.now(),
      });
    } else {
      await addDoc(collection(db, "users", firebaseUser.uid, "products"), {
        ...formData,
        price: Number(formData.price),
        updatedAt: Date.now(),
      });
    }
    
    setFormData({ name: "", nameAr: "", nameBn: "", categoryId: categories[0]?.id || "", price: 0, barcode: "" });
    setTaxInclusivePrice("");
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (prod: Product) => {
    setEditingId(prod.id!);
    setFormData({
      name: prod.name,
      nameAr: prod.nameAr || "",
      nameBn: prod.nameBn || "",
      categoryId: prod.categoryId,
      price: prod.price,
      barcode: prod.barcode
    });
    const taxRate = settings?.taxRate ?? 15;
    const inclusive = prod.price * (1 + taxRate / 100);
    setTaxInclusivePrice(inclusive.toFixed(2));
  };

  const handleDelete = async (id: string) => {
    if (!firebaseUser || !confirm("Are you sure?")) return;
    await deleteDoc(doc(db, "users", firebaseUser.uid, "products", id));
    fetchData();
  };

  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    return cat ? getLocalizedField(cat, "name", language) : "Unknown";
  };

  return (
    <div className="bento-container shrink-0 min-h-0 h-auto">
      <div className="card col-span-12 md:col-span-4 h-fit">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          {editingId ? t.editProduct : t.addProduct}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              {t.productNameEn} <span className="text-rose-500">*</span>
            </label>
            <input type="text"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              {t.productNameAr}
            </label>
            <input type="text" dir="rtl"
              value={formData.nameAr || ""} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              {t.productNameBn}
            </label>
            <input type="text"
              value={formData.nameBn || ""} onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">{t.selectCategory}</label>
            <select
              value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer" required>
              <option value="">{t.selectCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {getLocalizedField(c, "name", language)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">{t.priceExcl}</label>
              <input type="number" step="0.0001"
                value={formData.price || ""} onChange={(e) => handlePriceExcludingChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">{t.priceIncl} ({settings?.taxRate ?? 15}%)</label>
              <input type="number" step="0.01"
                value={taxInclusivePrice} onChange={(e) => handlePriceIncludingChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-blue-200 bg-blue-50/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm font-bold text-blue-800 animate-pulse-soft" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100/50 rounded-lg p-2 flex flex-col gap-0.5">
            <div>💡 {t.autoComputeTip}</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">{t.barcodeOpt}</label>
            <input type="text"
              value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition cursor-pointer">
              <Plus className="w-4 h-4" /> {editingId ? t.save : t.save}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ name: "", nameAr: "", nameBn: "", categoryId: categories[0]?.id || "", price: 0, barcode: "" }); setTaxInclusivePrice(""); }}
                className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition cursor-pointer"> {t.cancel} </button>
            )}
          </div>
        </form>
      </div>

      <div className="card col-span-12 md:col-span-8 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500">
                <th className="font-medium p-4">{t.productName}</th>
                <th className="font-medium p-4">{t.categories}</th>
                <th className="font-medium p-4">{t.priceExcl} / {t.priceIncl}</th>
                <th className="font-medium p-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">
                    <div className="flex flex-col">
                      <span>{getLocalizedField(prod, "name", language)}</span>
                      {prod.nameAr && language !== "ar" && <span className="text-[10px] text-slate-400 font-normal">{prod.nameAr}</span>}
                      {prod.nameBn && language !== "bn" && <span className="text-[10px] text-slate-400 font-normal">{prod.nameBn}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded text-[10px] uppercase tracking-wider">{getCategoryName(prod.categoryId)}</span>
                  </td>
                  <td className="p-4 flex flex-col justify-center">
                    <span className="font-bold text-slate-800">SAR {prod.price.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{t.excl}</span></span>
                    <span className="text-xs text-slate-500 font-semibold">
                      SAR {(prod.price * (1 + (settings?.taxRate ?? 15) / 100)).toFixed(2)} <span className="text-[9px] text-slate-400 font-normal text-slate-400">{t.incl} ({settings?.taxRate ?? 15}%)</span>
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleEdit(prod)} className="text-slate-500 hover:text-blue-600 p-2 rounded-lg transition-colors inline-flex mr-1 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(prod.id!)} className="text-slate-500 hover:text-red-600 p-2 rounded-lg transition-colors inline-flex cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (<tr><td colSpan={4} className="p-8 text-center text-slate-500">{t.noProducts}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
