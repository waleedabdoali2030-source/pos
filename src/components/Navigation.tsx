import { Link, useLocation } from "react-router-dom";
import { Store, CreditCard, LayoutGrid, Package, Settings, Receipt, CirclePower } from "lucide-react";
import { useStore } from "../store/useStore";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { DaySession } from "../types";
import { translations } from "../lib/translations";

export function Navigation() {
  const location = useLocation();
  const { firebaseUser, session, setSession, language, setLanguage } = useStore();
  const t = translations[language] || translations.en;

  useEffect(() => {
    if (!firebaseUser) return;
    const fetchSession = async () => {
      const q = query(
        collection(db, "users", firebaseUser.uid, "day_sessions"),
        where("status", "==", "open")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSession({ id: snap.docs[0].id, ...snap.docs[0].data() } as DaySession);
      } else {
        setSession(null);
      }
    };
    fetchSession();
  }, [firebaseUser]);

  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  const handleToggleDay = () => {
    if (session) {
      setIsCloseConfirmOpen(true);
    } else {
      openDay();
    }
  };

  const openDay = async () => {
    if (!firebaseUser) return;
    const newSession: DaySession = {
      startTime: Date.now(),
      endTime: null,
      status: "open",
      totalSales: 0,
      totalCash: 0,
      totalCard: 0,
      totalInvoices: 0,
      invoiceSequenceStart: 1, // Resets count to 1
    };
    const docRef = await addDoc(collection(db, "users", firebaseUser.uid, "day_sessions"), newSession);
    setSession({ id: docRef.id, ...newSession });
  };

  const closeDay = async () => {
    if (!firebaseUser || !session) return;
    await updateDoc(doc(db, "users", firebaseUser.uid, "day_sessions", session.id), {
      status: "closed",
      endTime: Date.now(),
    });
    setSession(null);
    setIsCloseConfirmOpen(false);
  };

  const navItems = [
    { name: t.pos, path: "/", icon: Store },
    { name: t.transactions, path: "/transactions", icon: Receipt },
    { name: t.categories, path: "/categories", icon: LayoutGrid },
    { name: t.products, path: "/products", icon: Package },
    { name: t.paymentMethods, path: "/payment-methods", icon: CreditCard },
    { name: t.settings, path: "/settings", icon: Settings },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">{t.appName}</span>
          </div>
          <nav className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Persistent multi-language switcher */}
          <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg p-0.5 font-sans" dir="ltr">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                language === "en" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("ar")}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                language === "ar" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              عربي
            </button>
            <button
              onClick={() => setLanguage("bn")}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                language === "bn" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              বাংলা
            </button>
          </div>

          {session && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              {t.dayOpen}
            </div>
          )}
          <button
            onClick={handleToggleDay}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              session
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {session ? t.closeDay : t.openDay}
          </button>
        </div>
      </header>

      {/* Close Day Confirmation Modal */}
      {isCloseConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <CirclePower className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t.confirmCloseDayTitle}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {t.confirmCloseDayDesc}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCloseConfirmOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm cursor-pointer"
              >
                {t.noKeepDayOpen}
              </button>
              <button
                onClick={closeDay}
                className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition text-sm shadow-sm cursor-pointer"
              >
                {t.yesCloseDay}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
