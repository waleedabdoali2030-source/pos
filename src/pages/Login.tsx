import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { auth } from "../lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { Lock, Store, Delete, ArrowLeft } from "lucide-react";
import { translations } from "../lib/translations";

export function Login() {
  const [pin, setPin] = useState("");
  const { firebaseUser, setFirebaseUser, unlockTerminal, language, setLanguage } = useStore();
  const [error, setError] = useState("");
  const t = translations[language] || translations.en;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous authentication failed:", err);
        }
      }
    });
    return () => unsub();
  }, [setFirebaseUser]);

  const handlePin = (num: string) => {
    if (pin.length < 4) {
      setPin((p) => p + num);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };
  
  const handleLogin = (customPin?: string) => {
    const pinToCheck = customPin !== undefined ? customPin : pin;
    if (!unlockTerminal(pinToCheck)) {
      setError(t.invalidPin || "Invalid PIN. Standard is 123.");
      setPin("");
    }
  };

  // Keyboard and Num-Keypad Listener
  useEffect(() => {
    if (!firebaseUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Numbers/Keypad
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePin(e.key);
      }
      
      // Delete/Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }

      // Clear (Escape or Delete)
      if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        handleClear();
      }

      // Enter to Submit
      if (e.key === "Enter") {
        e.preventDefault();
        if (pin.length > 0) {
          handleLogin(pin);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, firebaseUser, language]);

  if (!firebaseUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <Store className="w-8 h-8 text-slate-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-4" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Dynamic Floating Language Switcher above login box */}
      <div className="mb-4 flex items-center border border-slate-200 bg-white rounded-xl p-1 shadow-xs" dir="ltr">
        <button
          onClick={() => setLanguage("en")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            language === "en" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage("ar")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            language === "ar" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          العربية
        </button>
        <button
          onClick={() => setLanguage("bn")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            language === "bn" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          বাংলা
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 w-full max-w-sm flex flex-col items-center">
        {/* Modern Logo Header */}
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20 mb-3 hover:scale-105 transition-transform duration-200">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.systemAccess}</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6 font-medium uppercase tracking-wider">{t.terminalTerminal}</p>
        
        {/* Pin Code Bubble Indicator */}
        <div className="flex gap-4 justify-center mb-6" dir="ltr">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 border-2 ${
                  isFilled
                    ? "bg-slate-800 border-slate-800 scale-110 shadow-sm"
                    : "border-slate-300 bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="w-full text-center text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl py-2 px-3 mb-4 animate-shake">
            {error}
          </div>
        )}

        {/* 4x3 Tactical Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6" dir="ltr">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePin(num.toString())}
              className="w-16 h-16 rounded-full border border-slate-100 flex items-center justify-center font-bold text-xl text-slate-800 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
            >
              {num}
            </button>
          ))}
          
          <button
            onClick={handleClear}
            className="w-16 h-16 rounded-full border border-slate-100 flex items-center justify-center font-bold text-sm text-slate-500 hover:text-rose-600 bg-slate-100/50 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
            title="Clear"
          >
            C
          </button>

          <button
            onClick={() => handlePin("0")}
            className="w-16 h-16 rounded-full border border-slate-100 flex items-center justify-center font-bold text-xl text-slate-800 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            disabled={pin.length === 0}
            className="w-16 h-16 rounded-full border border-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-700 bg-slate-100/50 hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm mx-auto"
            title="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-6">{t.defaultPin}: 123</p>

        {/* Unlock Button */}
        <button
          onClick={() => handleLogin()}
          disabled={pin.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold shadow-md shadow-blue-600/15 disabled:opacity-50 disabled:shadow-none hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer"
        >
          {t.unlockTerminal}
        </button>
      </div>
    </div>
  );
}

