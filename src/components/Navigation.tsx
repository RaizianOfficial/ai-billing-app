"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, LayoutDashboard, LogOut, Package, ClipboardList } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { name: "Billing", href: "/", icon: ShoppingCart },
    { name: "Admin", href: "/admin", icon: LayoutDashboard },
  ];

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-black tracking-tight">POINT-OF-SALE</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline bg-slate-100 px-3 py-1 rounded-full">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 shadow-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Spacer */}
      <div className="h-16" />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 px-4 pb-6 pt-2 pointer-events-none">
        <div className="mx-auto max-w-[280px] pointer-events-auto">
          <div className="flex items-center justify-around bg-black/90 backdrop-blur-xl border border-white/20 p-2 rounded-3xl shadow-2xl shadow-black/40">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center w-24 h-14 rounded-2xl transition-all duration-300 ${
                    isActive 
                      ? "text-white" 
                      : "text-slate-400 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  {/* Subtle Glow & Filled Background for Active State */}
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10 rounded-2xl shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]">
                       <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-b-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    </div>
                  )}

                  <item.icon 
                    size={22} 
                    className={`relative z-10 transition-transform duration-300 ${isActive ? "-translate-y-1" : ""}`} 
                  />
                  
                  <span className={`relative z-10 text-[10px] font-bold mt-1 transition-all duration-300 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute bottom-2"}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
