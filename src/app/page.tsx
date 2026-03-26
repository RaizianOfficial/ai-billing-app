"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Navigation } from "@/components/Navigation";
import { useCartStore } from "@/store/useCartStore";
import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
  Printer,
  Download,
  CheckCircle,
  PackageSearch,
  X
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
  const { items, addItem, removeItem, updateQuantity, updatePrice, clearCart, getTotal } = useCartStore();
  
  const [showScanner, setShowScanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [processing, setProcessing] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);
  const [currentReceiptDoc, setCurrentReceiptDoc] = useState<jsPDF | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showCart, setShowCart] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // In-memory cache: barcode -> product (avoids repeated Firestore lookups)
  const productCacheRef = useRef<Map<string, Product | null>>(new Map());

  // 1. Initial Data Fetch: Pre-cache ALL products for instant scanning
  useEffect(() => {
    let isMounted = true;
    const preCacheProducts = async () => {
      try {
        const q = query(collection(db, "products"));
        const snapshot = await getDocs(q);
        if (!isMounted) return;
        
        snapshot.forEach((doc) => {
          const product = { id: doc.id, ...doc.data() } as Product;
          if (product.barcode) {
            productCacheRef.current.set(product.barcode, product);
          }
        });
        console.log(`Pre-cached ${productCacheRef.current.size} products for instant scanning.`);
      } catch (err) {
        console.error("Failed to pre-cache products", err);
      }
    };
    preCacheProducts();
    return () => { isMounted = false; };
  }, []);

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

  const handleScan = useCallback(async (barcode: string) => {
    const cache = productCacheRef.current;

    // 1. Check cache first — instant if already looked up
    if (cache.has(barcode)) {
      const cached = cache.get(barcode);
      if (cached) {
        addItem(cached);
        showToast(`Added ${cached.name} to cart`);
        setShowScanner(false);
        setShowCart(true); // Open cart immediately
        return true;
      }
    }

    // 2. Not cached — query Firestore
    const q = query(collection(db, "products"), where("barcode", "==", barcode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const product = { id: docSnap.id, ...docSnap.data() } as Product;
      cache.set(barcode, product); // cache it
      addItem(product);
      showToast(`Added ${product.name} to cart`);
      setShowScanner(false);
      setShowCart(true); // Open cart immediately
      return true;
    } else {
      // 3. Not found — Show "Add New Product" Modal
      setScannedBarcode(barcode);
      setShowScanner(false);
      setShowAddModal(true);
      return false;
    }
  }, [addItem, showToast]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setProcessing(true);
    let saleId = "";
    const currentTotal = getTotal();
    const snapItems = [...items]; // snapshot representing the cart

    try {
      const batch = writeBatch(db);
      
      // 1. Create Sale
      const saleRef = doc(collection(db, "sales"));
      saleId = saleRef.id;
      
      batch.set(saleRef, {
        totalAmount: currentTotal,
        createdAt: serverTimestamp(),
      });

      // 2. Create Sale Items
      snapItems.forEach((item) => {
        const saleItemRef = doc(collection(db, "saleItems"));
        batch.set(saleItemRef, {
          saleId: saleId,
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          createdAt: serverTimestamp(),
        });
      });

      // Execute transaction completely before generating receipt
      await batch.commit();

      try {
        // 3. Generate Thermal Receipt and load into UI Modal instead of auto-downloading immediately 
        const pdfDoc = generateReceipt(saleId, snapItems, currentTotal);
        setCurrentReceiptDoc(pdfDoc);
        // datauristring is widely supported in iframes across all browsers
        const pdfUrl = pdfDoc.output("datauristring") as unknown as string;
        setReceiptPdfUrl(pdfUrl);
      } catch (pdfErr) {
        console.error("PDF Generation error:", pdfErr);
        alert("Bill saved, but receipt generation failed. " + String(pdfErr));
      }

      // 4. Clear Cart on success ONLY
      clearCart();
      setShowCart(false);
    } catch (err: any) {
      console.error(err);
      alert(`Checkout Error: ${err?.message || "Please check your database connection or rules."}`);
    } finally {
      setProcessing(false);
    }
  };

  const generateReceipt = (saleId: string, printedItems: any[], total: number) => {
    // 80mm generic thermal printer format
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 200] // Initial arbitrary height, we usually print exact height but PDF preview is responsive
    });
    
    const pageWidth = 80;
    
    // Header
    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.text("RAIZIAN STORE", pageWidth / 2, 12, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("---------------------------------------", pageWidth / 2, 18, { align: "center" });

    const now = new Date();
    // Use narrower font spacing specifically for Courier
    doc.text(`Date: ${now.toLocaleDateString()}`, 4, 24);
    doc.text(`Time: ${now.toLocaleTimeString()}`, 4, 29);
    doc.text(`ID:   ${saleId.slice(-6).toUpperCase()}`, 4, 34);

    doc.text("---------------------------------------", pageWidth / 2, 39, { align: "center" });
    
    // Table Header
    doc.text("Item", 4, 44);
    doc.text("Qty", 48, 44, { align: "center" });
    doc.text("Total", 76, 44, { align: "right" });
    
    doc.text("---------------------------------------", pageWidth / 2, 49, { align: "center" });
    
    // Items
    let y = 54;
    printedItems.forEach((item) => {
      let itemName = typeof item.name === "string" ? item.name : "Unknown Item";
      let nameStr = itemName.substring(0, 16); // limit length for thermal realism
      doc.text(nameStr, 4, y);
      
      const qty = item.quantity || 1;
      const price = item.price || 0;
      doc.text(qty.toString(), 48, y, { align: "center" });
      const itemTotal = (price * qty).toFixed(2);
      doc.text(`$${itemTotal}`, 76, y, { align: "right" });
      y += 6;
    });

    // Footer
    doc.text("---------------------------------------", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(12);
    doc.setFont("courier", "bold");
    doc.text("TOTAL:", 4, y);
    doc.text(`$${total.toFixed(2)}`, 76, y, { align: "right" });
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("=======================================", pageWidth / 2, y, { align: "center" });
    
    y += 8;
    doc.text("Thank you for shopping!", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.text("Please visit again.", pageWidth / 2, y, { align: "center" });
    
    return doc;
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-[#0c1324]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-white"></div>
  </div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      <Navigation />
      
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* Header & Search Area */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing</h2>
                   <p className="text-sm font-semibold text-slate-500">Quickly add items and checkout</p>
                </div>
                <button
                  onClick={() => setShowCart(true)}
                  className="relative p-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-700 active:scale-95 transition-all"
                >
                   <ShoppingCart size={24} />
                   {items.length > 0 && (
                     <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
                       {items.reduce((acc, item) => acc + item.quantity, 0)}
                     </span>
                   )}
                </button>
             </div>

             <div className="relative group w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Search products by name..."
                  className="w-full rounded-2xl border border-slate-200 py-4 pl-12 pr-4 outline-none focus:border-black focus:ring-4 focus:ring-black/5 bg-white transition-all font-bold text-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
               <PackageSearch className="text-slate-400" size={18} />
               <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Search Results</h3>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex cursor-pointer items-center justify-between rounded-3xl bg-white border border-slate-100 p-5 transition-all hover:border-black active:scale-[0.98] group shadow-sm shadow-slate-200/50"
                    onClick={() => {
                      addItem(product);
                      showToast(`Added ${product.name}`);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="font-bold text-lg text-slate-900 leading-tight">{product.name}</p>
                      <p className="text-sm font-bold text-black/50">${product.price.toFixed(2)} / ea</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">
                      <Plus size={24} />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <div className="bg-slate-100 p-6 rounded-full mb-4">
                    <Search size={40} className="opacity-20" />
                 </div>
                 <p className="font-bold">No products found</p>
                 <p className="text-xs">Try a different search term</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <div className="bg-slate-100 p-8 rounded-full mb-6">
                    <Scan size={56} className="opacity-10" />
                 </div>
                 <p className="font-bold text-center">Ready to scan or search</p>
                 <p className="text-xs text-center max-w-[200px] mt-2">Tap the floating button below to start scanning barcodes</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Scan Button */}
      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-3xl bg-black text-white shadow-2xl shadow-black/40 active:scale-90 transition-transform hover:bg-neutral-800"
      >
        <Scan size={28} />
      </button>

      {/* Bottom Sheet Cart */}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           {/* Dismiss Background Overlay */}
           <div className="absolute inset-0" onClick={() => setShowCart(false)} />
           
           <div className="relative w-full max-w-xl bg-white rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-500 ease-out">
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4" onClick={() => setShowCart(false)} />
              
              <div className="px-8 pb-4 pt-2 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-2xl">
                       <ShoppingCart size={24} className="text-black" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Your Cart</h2>
                 </div>
                 <button 
                   onClick={() => setShowCart(false)}
                   className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                 >
                    <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 custom-scrollbar">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div key={item.id} className="flex flex-col rounded-3xl border border-slate-100 p-4 bg-slate-50/30">
                      <div className="flex justify-between items-start mb-3">
                         <div>
                            <p className="font-bold text-lg text-slate-900 leading-tight">{item.name}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">UNIT PRICE: ${item.price.toFixed(2)}</p>
                         </div>
                         <p className="font-black text-xl text-black ml-2">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-100 shadow-sm">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
                          >
                            <Minus size={20} />
                          </button>
                          <span className="font-black text-slate-900 min-w-[40px] text-center text-lg">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-neutral-100 hover:text-black active:scale-95 transition-all"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-2 text-red-500 font-bold text-sm px-4 py-2 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={18} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                     <ShoppingCart size={80} className="mb-6 opacity-10" />
                     <p className="font-black text-xl">Empty Cart</p>
                     <p className="text-sm font-semibold max-w-[200px] text-center mt-2">Add some products to see them here.</p>
                  </div>
                )}
              </div>

              <div className="p-8 pb-10 bg-white border-t border-slate-100">
                 <div className="flex justify-between items-end mb-8">
                    <div className="flex flex-col">
                       <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total items</span>
                       <span className="text-lg font-black">{items.reduce((acc, item) => acc + item.quantity, 0)} Units</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Payable Amount</span>
                       <span className="text-4xl font-black text-black">${getTotal().toFixed(2)}</span>
                    </div>
                 </div>
                  <button
                    onClick={handleCheckout}
                    disabled={items.length === 0 || processing}
                    className="w-full flex items-center justify-center gap-3 rounded-[28px] bg-black py-5 font-black text-white text-lg transition-all hover:bg-neutral-800 active:scale-95 disabled:bg-slate-200 shadow-2xl shadow-black/20"
                  >
                   {processing ? (
                     <>
                       <Loader2 className="animate-spin" size={24} />
                       PROCESSING...
                     </>
                   ) : (
                     <><CreditCard size={24} /> COMPLETE CHECKOUT</>
                   )}
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Scanners and Modals */}
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
            showToast("New product created");
            setShowCart(true); // Open cart to show the new item
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      
      {/* Receipt Preview */}
      {receiptPdfUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 bg-white border-b border-slate-100">
               <div className="flex items-center gap-3">
                 <div className="bg-green-50 p-2 rounded-xl">
                    <CheckCircle className="text-green-600" size={24} />
                 </div>
                 <h2 className="font-black text-slate-900 text-xl tracking-tight">Sale Completed</h2>
               </div>
               <button 
                 onClick={() => {
                    setReceiptPdfUrl(null);
                    setCurrentReceiptDoc(null);
                 }}
                 className="p-2 rounded-full hover:bg-slate-100 transition-colors"
               >
                 <X size={24} className="text-slate-400" />
               </button>
            </div>
            
            <div className="flex-1 p-6 bg-slate-50 overflow-hidden">
               <iframe 
                 src={receiptPdfUrl} 
                 className="w-full h-[40vh] rounded-[24px] shadow-inner bg-white border border-slate-200" 
                 title="Receipt Preview"
               />
               <p className="mt-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Previewing Thermal Receipt</p>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-3">
               <button 
                 onClick={() => currentReceiptDoc?.save("receipt.pdf")}
                 className="w-full flex items-center justify-center gap-2 py-4 bg-black text-white font-black rounded-3xl text-lg transition-all active:scale-95 shadow-xl shadow-black/10"
               >
                 <Download size={22} /> DOWNLOAD RECEIPT
               </button>
               <button 
                 onClick={() => currentReceiptDoc?.autoPrint({variant: 'javascript'})}
                 className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-3xl text-lg transition-all active:scale-95"
               >
                 <Printer size={22} /> PRINT BILL
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] bg-black text-white px-8 py-4 rounded-3xl shadow-2xl shadow-black/40 font-black text-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-8 duration-500">
           {toastMessage.toLowerCase().includes("created") ? <CheckCircle size={20} className="text-green-400" /> : <Plus size={20} className="text-white" />}
           {toastMessage.toUpperCase()}
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
      `}</style>
    </div>
  );
}
