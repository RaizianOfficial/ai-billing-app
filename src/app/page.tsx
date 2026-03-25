"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Navigation } from "@/components/Navigation";
import { useCartStore } from "@/store/useCartStore";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Scan, 
  CreditCard, 
  Receipt,
  ShoppingCart,
  ChevronRight,
  PackageSearch
} from "lucide-react";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  writeBatch,
  doc
} from "firebase/firestore";
import { type Product } from "@/types";
import { jsPDF } from "jspdf";
import AddProductModal from "@/components/AddProductModal";

// Load scanner with dynamic import (SSR disabled)
const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

export default function Home() {
  const { user, loading: authLoading } = useAuthGuard();
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  
  const [showScanner, setShowScanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [processing, setProcessing] = useState(false);

  // Search logic
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      
      const q = query(
        collection(db, "products"),
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff")
      );
      
      const querySnapshot = await getDocs(q);
      const results: Product[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Product);
      });
      setSearchResults(results);
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleScan = async (barcode: string) => {
    // 1. Query Firestore for barcode
    const q = query(collection(db, "products"), where("barcode", "==", barcode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // 2. Found -> Add to Cart
      const doc = querySnapshot.docs[0];
      const product = { id: doc.id, ...doc.data() } as Product;
      addItem(product);
      setShowScanner(false);
    } else {
      // 3. Not Found -> Show Add Modal
      setScannedBarcode(barcode);
      setShowScanner(false);
      setShowAddModal(true);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Create Sale
      const saleRef = doc(collection(db, "sales"));
      const totalAmount = getTotal();
      
      batch.set(saleRef, {
        totalAmount,
        createdAt: serverTimestamp(),
      });

      // 2. Create Sale Items
      items.forEach((item) => {
        const saleItemRef = doc(collection(db, "saleItems"));
        batch.set(saleItemRef, {
          saleId: saleRef.id,
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();

      // 3. Generate Receipt
      generateReceipt(saleRef.id, items, totalAmount);

      // 4. Clear Cart
      clearCart();
      alert("Sale processed successfully!");
    } catch (err) {
      console.error(err);
      alert("Error processing sale!");
    } finally {
      setProcessing(false);
    }
  };

  const generateReceipt = (saleId: string, items: any[], total: number) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.text("POINT OF SALE RECEIPT", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Sale ID: ${saleId}`, 20, 30);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 35);
    
    // Table Header
    doc.line(20, 45, pageWidth - 20, 45);
    doc.setFontSize(12);
    doc.text("Item", 20, 52);
    doc.text("Qty", pageWidth - 70, 52, { align: "center" });
    doc.text("Price", pageWidth - 45, 52, { align: "center" });
    doc.text("Total", pageWidth - 20, 52, { align: "right" });
    doc.line(20, 55, pageWidth - 20, 55);
    
    // Items
    let y = 62;
    items.forEach((item) => {
      doc.setFontSize(10);
      doc.text(item.name, 20, y);
      doc.text(item.quantity.toString(), pageWidth - 70, y, { align: "center" });
      doc.text(`$${item.price.toFixed(2)}`, pageWidth - 45, y, { align: "center" });
      doc.text(`$${(item.price * item.quantity).toFixed(2)}`, pageWidth - 20, y, { align: "right" });
      y += 8;
    });

    // Footer
    doc.line(20, y, pageWidth - 20, y);
    doc.setFontSize(14);
    doc.text(`TOTAL: $${total.toFixed(2)}`, pageWidth - 20, y + 10, { align: "right" });
    
    doc.setFontSize(10);
    doc.text("Thank you for your purchase!", pageWidth / 2, y + 25, { align: "center" });
    
    doc.save(`receipt-${saleId}.pdf`);
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
  </div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Search and Results (7 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative flex-1 group w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Search items by name..."
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500 bg-slate-50 transition-all font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200"
                  >
                    <Scan size={20} /> SCAN BARCODE
                  </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 min-h-[400px]">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                 <PackageSearch className="text-slate-400" size={20} />
                 <h2 className="font-bold text-slate-800 tracking-tight">Search Results</h2>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/50 group"
                      onClick={() => addItem(product)}
                    >
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-blue-700 mb-0.5">{product.name}</p>
                        <p className="text-sm font-semibold text-blue-600">${product.price.toFixed(2)}</p>
                      </div>
                      <Plus className="text-slate-300 group-hover:text-blue-600" size={20} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                   <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <Search size={40} />
                   </div>
                   <p className="font-medium">No results found or waiting for search</p>
                   <p className="text-xs">Try searching for a product name</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart (5 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 sticky top-[88px] h-[calc(100vh-120px)] overflow-hidden">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       <ShoppingCart className="text-blue-600" size={22} />
                       <h2 className="text-xl font-bold text-slate-900">Cart</h2>
                   </div>
                   <span className="bg-blue-100 text-blue-700 px-3 py-0.5 rounded-full text-sm font-bold">
                      {items.reduce((acc, item) => acc + item.quantity, 0)} items
                   </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div key={item.id} className="flex flex-col rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                        <div className="flex justify-between mb-2">
                           <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                           <p className="font-bold text-blue-600 text-sm whitespace-nowrap ml-2">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="rounded-lg bg-white p-1 hover:bg-red-50 hover:text-red-500 border border-slate-100 shadow-sm transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-bold text-slate-700 min-w-[20px] text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="rounded-lg bg-white p-1 hover:bg-blue-50 hover:text-blue-500 border border-slate-100 shadow-sm transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 py-12">
                       <ShoppingCart size={48} className="mb-4 opacity-50" />
                       <p className="font-bold">Your cart is empty</p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Total Amount</span>
                      <span className="text-3xl font-black text-slate-900">${getTotal().toFixed(2)}</span>
                   </div>
                   <button
                    onClick={handleCheckout}
                    disabled={items.length === 0 || processing}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:bg-slate-300 shadow-xl shadow-slate-200"
                   >
                    {processing ? "Processing..." : <><CreditCard size={20} /> CHECKOUT & PRINT</>}
                   </button>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Conditionally rendered scanners and modals */}
      {showScanner && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {showAddModal && (
        <AddProductModal
          initialBarcode={scannedBarcode}
          onSuccess={(product) => {
            addItem(product);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
