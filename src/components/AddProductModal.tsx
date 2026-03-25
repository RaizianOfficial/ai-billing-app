"use client";

import { useState } from "react";
import { X, Plus, PackagePlus } from "lucide-react";
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

    if (!name || !price || !barcode) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      const productData = {
        name,
        price: parseFloat(price),
        barcode,
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Add New Product</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 font-semibold">Barcode</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-medium focus:border-blue-500 focus:outline-none transition-colors"
              value={barcode}
              readOnly={!!initialBarcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 font-semibold">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Coca Cola 500ml"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 font-semibold">Price ($)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none transition-colors"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Adding..." : <><Plus size={20} /> Create Product</>}
          </button>
        </form>
      </div>
    </div>
  );
}
