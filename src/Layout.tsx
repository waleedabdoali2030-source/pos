import { Navigation } from "./components/Navigation";
import { useStore } from "./store/useStore";
import { Login } from "./pages/Login";
import { Outlet } from "react-router-dom";

export function Layout() {
  const { firebaseUser, terminalUnlocked, language } = useStore();

  if (!firebaseUser || !terminalUnlocked) {
    return <Login />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans" dir={language === "ar" ? "rtl" : "ltr"}>
      <Navigation />
      
      <main className="flex-1 overflow-auto max-w-[1440px] mx-auto w-full p-2 lg:p-4">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
        <div className="flex gap-4">
          <span>System Version: 2.4.0-pro</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Firebase Connected
          </span>
        </div>
        <div>Waleed Al Qadasi | 0503189758 | wal87ye@gmail.com</div>
        <div className="text-slate-400 uppercase tracking-widest font-bold">© 2024 POS Dynamics</div>
      </footer>
    </div>
  );
}
