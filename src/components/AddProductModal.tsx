"use client";

import { useState } from "react";
import { X, Plus, PackagePlus, Loader2 } from "lucide-react";
import { type Product } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface AddProductModalProps {
  initialBarcode?: string;
  onSuccess: (product: Product) => void;
  onClose: () => void;
}

export default function AddProductModal({
  initialBarcode = "",
  onSuccess,
  onClose,
}: AddProductModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim() || !price || !barcode.trim()) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Price must be a valid number greater than 0");
      setLoading(false);
      return;
    }

    try {
      const productData = {
        name: name.trim(),
        price: parsedPrice,
        barcode: barcode.trim(),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "products"), productData);
      const newProduct: Product = {
        id: docRef.id,
        ...productData,
        createdAt: new Date(), // Local approximation for immediate update
      };

      onSuccess(newProduct);
    } catch (err: any) {
      setError(err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-[40px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-3 rounded-2xl">
               <PackagePlus className="text-black" size={28} />
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Product</h2>
               <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Inventory Registration</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2.5 hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Barcode ID</label>
            <div className="relative">
               <input
                 type="text"
                 required
                 className={`w-full rounded-2xl border-2 px-5 py-4 font-black transition-all ${
                   initialBarcode 
                   ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" 
                   : "bg-white border-slate-100 focus:border-black outline-none"
                 }`}
                 value={barcode}
                 readOnly={!!initialBarcode}
                 onChange={(e) => setBarcode(e.target.value)}
               />
               {initialBarcode && (
                 <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">System Locked</span>
                 </div>
               )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Product Designation</label>
            <input
              type="text"
              required
              placeholder="e.g. Coca Cola 500ml"
              className="w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 focus:border-black outline-none transition-all font-black text-slate-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!initialBarcode}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unit Price ($)</label>
            <div className="relative">
               <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">$</span>
               <input
                 type="number"
                 step="0.01"
                 required
                 placeholder="0.00"
                 className="w-full rounded-2xl border-2 border-slate-100 bg-white pl-12 pr-5 py-4 focus:border-black outline-none transition-all font-black text-slate-900 text-xl"
                 value={price}
                 onChange={(e) => setPrice(e.target.value)}
               />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl animate-in shake duration-300">
               <p className="text-xs text-red-600 font-black uppercase tracking-tight text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-[28px] bg-black py-5 font-black text-white text-lg transition-all hover:bg-neutral-800 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 shadow-2xl shadow-black/10"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <><Plus size={24} /> REGISTER & ADD</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
