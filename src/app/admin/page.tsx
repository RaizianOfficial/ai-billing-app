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
  Barcode,
  LayoutDashboard
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
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "stats" | "settings">("products");
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

  const tabs = [
    { id: "products", label: "Inventory", icon: Package },
    { id: "orders", label: "History", icon: Hash }, // Using alternatives for demo
    { id: "stats", label: "Insights", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 self-start sm:self-center">
            <div className="bg-black p-3 rounded-2xl text-white shadow-xl shadow-black/10">
               <LayoutDashboard size={28} />
            </div>
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Admin Panel</h1>
               <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Store Management Hub</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide">
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                 activeTab === tab.id 
                 ? "bg-black text-white shadow-lg shadow-black/20" 
                 : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
               }`}
             >
               <tab.icon size={18} />
               {tab.label}
             </button>
           ))}
        </div>

        {activeTab === "products" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative group flex-1 max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Filter inventory..."
                  className="w-full rounded-2xl border border-slate-100 py-3.5 pl-12 pr-4 outline-none focus:border-black bg-slate-50/50 transition-all font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-2xl bg-black px-8 py-4 font-black text-white transition-all hover:bg-neutral-800 active:scale-95 shadow-xl shadow-black/10 justify-center"
              >
                <PlusCircle size={20} /> NEW PRODUCT
              </button>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Barcode</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Price</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                       <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold">Querying database...</td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          {editingId === p.id ? (
                            <input
                              type="text"
                              className="w-full rounded-xl border-2 border-black px-4 py-2 outline-none bg-white font-bold"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-lg">{p.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Active SKU</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                           <code className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 tracking-tighter shadow-inner">{p.barcode}</code>
                        </td>
                        <td className="px-8 py-6">
                          {editingId === p.id ? (
                            <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                               <input
                                type="number"
                                step="0.01"
                                className="w-32 rounded-xl border-2 border-black pl-8 pr-4 py-2 outline-none bg-white font-bold"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                               />
                            </div>
                          ) : (
                            <span className="font-black text-black text-lg">${p.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-3">
                            {editingId === p.id ? (
                              <>
                                <button
                                  onClick={() => handleEditSave(p.id)}
                                  className="rounded-xl bg-green-500 p-3 text-white shadow-lg shadow-green-200 transition-all hover:bg-green-600 active:scale-95"
                                >
                                  <Check size={20} />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="rounded-xl bg-slate-100 p-3 text-slate-500 transition-all hover:bg-slate-200 active:scale-95"
                                >
                                  <X size={20} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditStart(p)}
                                  className="rounded-xl bg-slate-50 p-3 text-slate-400 border border-slate-100 transition-all hover:bg-black hover:text-white active:scale-95 opacity-0 group-hover:opacity-100"
                                >
                                  <Edit size={20} />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="rounded-xl bg-slate-50 p-3 text-slate-400 border border-slate-100 transition-all hover:bg-red-500 hover:text-white active:scale-95 opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                       <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold">Empty Inventory</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[32px] p-20 border border-slate-100 flex flex-col items-center justify-center text-slate-300">
              <Hash size={64} className="opacity-10 mb-6" />
              <p className="font-black text-xl">Order History Coming Soon</p>
              <p className="text-sm font-semibold mt-2">All transactions will be logged here.</p>
           </div>
        )}

        {activeTab === "stats" && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[32px] p-20 border border-slate-100 flex flex-col items-center justify-center text-slate-300">
              <DollarSign size={64} className="opacity-10 mb-6" />
              <p className="font-black text-xl">Revenue Insights Coming Soon</p>
              <p className="text-sm font-semibold mt-2">Track your daily sales and margins.</p>
           </div>
        )}
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
