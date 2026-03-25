"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X,
  PlusCircle,
  Hash,
  DollarSign,
  Barcode
} from "lucide-react";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { type Product } from "@/types";
import AddProductModal from "@/components/AddProductModal";

export default function AdminPage() {
  const { loading: authLoading } = useAuthGuard();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Real-time listener for products
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err) {
      alert("Error deleting product");
    }
  };

  const handleEditStart = (product: Product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price.toString());
  };

  const handleEditSave = async (id: string) => {
    try {
      await updateDoc(doc(db, "products", id), {
        name: editName,
        price: parseFloat(editPrice),
      });
      setEditingId(null);
    } catch (err) {
      alert("Error updating product");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-100">
               <Package size={24} />
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Inventory</h1>
               <p className="text-sm font-medium text-slate-500">Manage your store items and pricing</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100 w-full sm:w-auto justify-center"
          >
            <PlusCircle size={20} /> ADD PRODUCT
          </button>
        </div>

        <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative group max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500 bg-slate-50 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-2"><Package size={14}/> Name</div></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-2"><Barcode size={14}/> Barcode</div></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-2"><DollarSign size={14}/> Price</div></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading inventory...</td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      {editingId === p.id ? (
                        <input
                          type="text"
                          className="w-full rounded-lg border border-blue-200 px-3 py-1.5 outline-none focus:border-blue-500 bg-blue-50/50 font-medium"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{p.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-600">{p.barcode}</code>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === p.id ? (
                        <div className="relative">
                           <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                           <input
                            type="number"
                            step="0.01"
                            className="w-24 rounded-lg border border-blue-200 pl-6 pr-3 py-1.5 outline-none focus:border-blue-500 bg-blue-50/50 font-medium"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                           />
                        </div>
                      ) : (
                        <span className="font-bold text-blue-600">${p.price.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === p.id ? (
                          <>
                            <button
                              onClick={() => handleEditSave(p.id)}
                              className="rounded-lg bg-green-50 p-2 text-green-600 shadow-sm border border-green-100 transition-all hover:bg-green-100"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg bg-slate-50 p-2 text-slate-600 shadow-sm border border-slate-100 transition-all hover:bg-slate-100"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditStart(p)}
                              className="rounded-lg bg-slate-50 p-2 text-slate-400 shadow-sm border border-slate-100 transition-all hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 opacity-0 group-hover:opacity-100"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="rounded-lg bg-slate-50 p-2 text-slate-400 shadow-sm border border-slate-100 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No products found. Add one to get started!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showAddModal && (
        <AddProductModal 
          onSuccess={() => setShowAddModal(false)} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </div>
  );
}
