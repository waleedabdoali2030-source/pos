import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useStore } from "../store/useStore";
import { Save } from "lucide-react";

export function Settings() {
  const { firebaseUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeName: "",
    phone: "",
    address: "",
    taxNumber: "",
    taxRate: 15,
    receiptHeader: "Welcome to our store!",
    receiptFooter: "Thank you for your visit!",
  });

  useEffect(() => {
    if (!firebaseUser) return;
    const fetchSettings = async () => {
      const docRef = doc(db, "users", firebaseUser.uid, "settings", "default");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFormData(docSnap.data() as any);
      }
    };
    fetchSettings();
  }, [firebaseUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleSave = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", firebaseUser.uid, "settings", "default"), {
        ...formData,
        taxRate: parseFloat(formData.taxRate as any) || 0,
        updatedAt: Date.now(),
      });
      alert("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      alert("Error saving settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex justify-center w-full">
      <div className="card w-full max-w-2xl h-fit">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Store Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Store Name</label>
            <input
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Tax Number</label>
              <input
                type="text"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Receipt Header</label>
            <textarea
              name="receiptHeader"
              value={formData.receiptHeader}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Receipt Footer</label>
            <textarea
              name="receiptFooter"
              value={formData.receiptFooter}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            ></textarea>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full mt-6 py-3 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-5 h-5" />
            {loading ? "SAVING..." : "SAVE SETTINGS"}
          </button>
        </div>
      </div>
    </div>
  );
}
