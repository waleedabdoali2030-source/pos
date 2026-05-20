import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, where, addDoc, doc, updateDoc, increment } from "firebase/firestore";
import { useStore } from "../store/useStore";
import { Product, Category, PaymentMethod, Setting, InvoiceItem, DaySession } from "../types";
import { Search, ShoppingCart, Trash2, CheckCircle2, ArrowLeft, Delete, CirclePower, Lock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { translations, getLocalizedField } from "../lib/translations";

export function POS() {
  const { firebaseUser, cart, addToCart, removeFromCart, clearCart, updateQuantity, session, setSession, language } = useStore();
  const t = translations[language] || translations.en;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<Setting | null>(null);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountTendered, setAmountTendered] = useState("0");

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    const loadData = async () => {
      const pSnap = await getDocs(query(collection(db, "users", firebaseUser.uid, "products")));
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      const cSnap = await getDocs(query(collection(db, "users", firebaseUser.uid, "categories")));
      setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
      const mSnap = await getDocs(query(collection(db, "users", firebaseUser.uid, "payment_methods"), where("isActive", "==", true)));
      setPaymentMethods(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod)));
      
      const setSnap = await getDocs(collection(db, "users", firebaseUser.uid, "settings"));
      if (!setSnap.empty) setSettings(setSnap.docs[0].data() as Setting);
    };
    loadData();
  }, [firebaseUser]);

  useEffect(() => {
    // Clear last invoice state and close receipt modal when day session changes (open/close)
    setLastInvoice(null);
    setReceiptModalOpen(false);
  }, [session?.id, session?.status]);

  const filteredProducts = products.filter(p => {
    const localizedName = getLocalizedField(p, "name", language).toLowerCase();
    const matchesSearch = localizedName.includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    return (activeCategory === "all" || p.categoryId === activeCategory) && matchesSearch;
  });

  const taxRate = settings?.taxRate || 0;
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100 * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleCheckout = async (methodId: string) => {
    if (!session || !firebaseUser) {
      alert(t.openDayRequired || "Please Open Day before making transactions.");
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const seq = session.invoiceSequenceStart + session.totalInvoices;
    
      // Create Invoice
      const isCash = selectedMethod?.id === methodId;
      const tendered = isCash ? parseFloat(amountTendered) || 0 : total;
      const changeAmt = isCash ? tendered - total : 0;

      const invoice = {
        sequenceNumber: seq,
        sessionId: session.id,
        date: Date.now(),
        subtotal,
        taxAmount,
        total,
        amountTendered: tendered,
        changeAmount: changeAmt,
        paymentMethodId: methodId,
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          nameAr: item.nameAr || "",
          nameBn: item.nameBn || "",
          price: item.price,
          quantity: item.quantity,
          total: item.total
        }))
      };
      
      const invRef = await addDoc(collection(db, "users", firebaseUser.uid, "invoices"), invoice);
      setLastInvoice({ id: invRef.id, ...invoice });
    
    // Update Session
    const method = paymentMethods.find(m => m.id === methodId);
    const isCashType = method?.type === "cash";
    const newTotalSales = session.totalSales + total;
    const newTotalInvoices = session.totalInvoices + 1;
    const newTotalCash = (session.totalCash || 0) + (isCashType ? total : 0);
    const newTotalCard = (session.totalCard || 0) + (!isCashType ? total : 0);

    const updateData: any = {
      totalSales: increment(total),
      totalInvoices: increment(1)
    };
    if (isCashType) updateData.totalCash = increment(total);
    else updateData.totalCard = increment(total);

    await updateDoc(doc(db, "users", firebaseUser.uid, "day_sessions", session.id), updateData);
    
    setSession({ 
      ...session, 
      totalSales: newTotalSales, 
      totalInvoices: newTotalInvoices,
      totalCash: newTotalCash,
      totalCard: newTotalCard
    });
    clearCart();
    setCheckoutModalOpen(false);
    setSelectedMethod(null);
    setAmountTendered("0");
    setReceiptModalOpen(true);
    } catch (e) {
      console.error(e);
      alert("Transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodName = (id: string) => {
    const pm = paymentMethods.find(m => m.id === id);
    return pm ? getLocalizedField(pm, "name", language) : "Unknown";
  };

  const handleKeypad = (val: string) => {
    if (val === "CLEAR") {
      setAmountTendered("0");
      return;
    }
    if (val === "BACKSPACE") {
      setAmountTendered(prev => {
        if (prev.length <= 1) return "0";
        return prev.slice(0, -1);
      });
      return;
    }
    if (val === ".") {
      if (amountTendered.includes(".")) return;
      setAmountTendered(prev => prev + ".");
      return;
    }
    
    if (amountTendered.includes(".")) {
      const parts = amountTendered.split(".");
      if (parts[1].length >= 2) return;
    }

    if (amountTendered === "0") {
      if (val === "0" || val === "") return;
      setAmountTendered(val);
    } else {
      setAmountTendered(prev => prev + val);
    }
  };

  // Keyboard listener for Cash payment checkout
  useEffect(() => {
    if (!checkoutModalOpen || !selectedMethod) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeypad(e.key);
      }
      
      // Decimals . or , or KeypadDecimal
      if (e.key === "." || e.key === ",") {
        e.preventDefault();
        handleKeypad(".");
      }

      // Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        handleKeypad("BACKSPACE");
      }

      // Clear (Escape)
      if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        handleKeypad("CLEAR");
      }

      // Enter to Confirm
      if (e.key === "Enter") {
        e.preventDefault();
        const tenderAmount = parseFloat(amountTendered) || 0;
        const changeVal = Math.round((tenderAmount - total) * 100) / 100;
        if (changeVal >= 0 && selectedMethod.id) {
          handleCheckout(selectedMethod.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [checkoutModalOpen, selectedMethod, amountTendered, total]);

  const handleOpenDay = async () => {
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

  if (!session || session.status !== "open") {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[calc(100vh-80px)]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {t.closedDay || "POS Terminal Locked"}
          </h2>
          <p className="text-slate-500 mt-2 mb-6 leading-relaxed">
            {t.terminalLockedDesc || "The cashier business day is currently closed. You cannot access or complete sales transactions in the POS until you open the business day."}
          </p>
          <button
            onClick={handleOpenDay}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CirclePower className="w-5 h-5" />
            {t.openDay || "OPEN BUSINESS DAY"}
          </button>
        </div>
      </div>
    );
  }

  const tenderAmount = parseFloat(amountTendered) || 0;
  const change = Math.round((tenderAmount - total) * 100) / 100;

  return (
    <div className="bento-container" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Products Area */}
      <div className="card col-span-12 md:col-span-8 p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 items-center rounded-t-2xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={t.searchProducts || "Search products..."} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex overflow-x-auto p-4 gap-2 border-b border-slate-100 shrink-0">
          <button 
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition cursor-pointer ${activeCategory === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t.allCategories || "All Products"}
          </button>
          {categories.map(c => (
            <button 
              key={c.id} 
              onClick={() => setActiveCategory(c.id!)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition cursor-pointer ${activeCategory === c.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {getLocalizedField(c, "name", language)}
              </div>
            </button>
          ))}
        </div>
 
        <div className="flex-1 overflow-y-auto p-4 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 absolute inset-4">
            {filteredProducts.map(p => (
              <button 
                key={p.id}
                onClick={() => addToCart({ productId: p.id!, name: p.name, nameAr: p.nameAr || "", nameBn: p.nameBn || "", price: p.price, quantity: 1, total: p.price })}
                className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-500 hover:shadow-md transition group aspect-square flex flex-col justify-between cursor-pointer"
              >
                <div className="font-medium text-slate-900 line-clamp-2">{getLocalizedField(p, "name", language)}</div>
                <div className="text-slate-500 font-bold">SAR {p.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="card col-span-12 md:col-span-4 p-0">
        <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-center rounded-t-2xl">
          <h2 className="font-bold text-center text-slate-600">{t.currentOrder || "Current Order"}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
              <p>{t.orderIsEmpty || "Order is empty"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{getLocalizedField(item, "name", language)}</div>
                    <div className="text-slate-500 text-xs">SAR {item.price.toFixed(2)} x {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold">SAR {item.total.toFixed(2)}</div>
                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 rounded-b-2xl">
          <div className="flex justify-between text-sm text-slate-600">
            <span>{t.subtotal || "Subtotal"}</span>
            <span className="font-medium">SAR {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{t.tax || "Tax"} ({taxRate}%)</span>
            <span className="font-medium">SAR {taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>{t.total || "TOTAL"}</span>
            <span>SAR {total.toFixed(2)}</span>
          </div>
          
          <button 
            disabled={cart.length === 0 || !session}
            onClick={() => {
              setCheckoutModalOpen(true);
              setAmountTendered(total.toFixed(2));
              setSelectedMethod(null);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold mt-4 shadow-lg disabled:opacity-50 transition cursor-pointer"
          >
            {t.checkout || "CHECKOUT"}
          </button>
          {!session && (
            <p className="text-red-500 text-xs text-center font-medium">Day must be open to checkout.</p>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutModalOpen && !selectedMethod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" dir={language === "ar" ? "rtl" : "ltr"}>
            <h3 className="text-xl font-bold mb-6 text-slate-800 text-center">
              {t.selectPayment || "Select Payment"}
            </h3>
            <div className="space-y-3">
              {paymentMethods.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (m.type === "cash") {
                      setSelectedMethod(m);
                    } else {
                      handleCheckout(m.id!);
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 transition flex items-center justify-between cursor-pointer"
                  style={{ borderLeftWidth: "4px", borderLeftColor: m.color }}
                >
                  <span className="font-bold text-slate-800">{getLocalizedField(m, "name", language)}</span>
                  <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 font-bold uppercase tracking-wider">{m.type}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCheckoutModalOpen(false)}
              className="w-full mt-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl transition font-bold cursor-pointer"
            >
              {t.cancel || "CANCEL"}
            </button>
          </div>
        </div>
      )}

      {/* Cash Keypad Modal */}
      {checkoutModalOpen && selectedMethod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setSelectedMethod(null)}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-slate-800">
                {t.cashPayment || "Cash Payment"}
              </h3>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>{t.totalDue || "Total Due"}</span>
                <span className="font-bold">SAR {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg text-slate-900 mb-4 border-b border-slate-200 pb-4">
                <span>{t.amountTendered || "Tendered"}</span>
                <span className="font-bold border px-3 py-1 rounded bg-white w-32 text-right">SAR {amountTendered}</span>
              </div>
              <div className="flex justify-between items-center text-xl">
                <span className="font-bold text-slate-600">{t.change || "Change"}</span>
                <span className={`font-bold ${change < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  SAR {Math.max(0, change).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 max-w-[280px] mx-auto" dir="ltr">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypad(num.toString())}
                  className="w-14 h-14 rounded-full border border-slate-100 flex items-center justify-center font-bold text-lg text-slate-850 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypad(".")}
                className="w-14 h-14 rounded-full border border-slate-100 flex items-center justify-center font-bold text-lg text-slate-850 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleKeypad("0")}
                className="w-14 h-14 rounded-full border border-slate-100 flex items-center justify-center font-bold text-lg text-slate-850 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypad("BACKSPACE")}
                className="w-14 h-14 rounded-full border border-slate-100 flex items-center justify-center font-bold text-slate-500 hover:text-slate-705 bg-slate-100/50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm mx-auto"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleKeypad("CLEAR")}
                className="col-span-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-rose-600 py-1 cursor-pointer transition-colors"
              >
                {t.clear || "Clear Amount"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAmountTendered(total.toFixed(2))}
                className="px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                {t.exact || "Exact"}
              </button>
              <button
                onClick={() => handleCheckout(selectedMethod.id!)}
                disabled={change < 0}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 transition shadow cursor-pointer"
              >
                {t.confirm || "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModalOpen && lastInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="text-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-xl font-semibold">
                {t.paymentSuccessful || "Payment Successful"}
              </h3>
            </div>
            
            <div className="receipt-paper mb-6 font-mono text-sm" dir={language === "ar" ? "rtl" : "ltr"}>
              <div className="text-center font-bold text-lg mb-2">
                {getLocalizedField(settings, "storeName", language) || settings?.storeName || "Store Name"}
              </div>
              <div className="text-center text-slate-500 mb-6 pb-4 border-b border-dashed border-slate-300">
                {(getLocalizedField(settings, "address", language) || settings?.address) && <div>{getLocalizedField(settings, "address", language) || settings?.address}</div>}
                {settings?.taxNumber && <div>Tax No: {settings.taxNumber}</div>}
                {settings?.phone && <div>Tel: {settings.phone}</div>}
                {(getLocalizedField(settings, "receiptHeader", language) || settings?.receiptHeader) && <div className="mt-2">{getLocalizedField(settings, "receiptHeader", language) || settings?.receiptHeader}</div>}
              </div>
              
              <div className="mb-4">
                <div>Inv #: {lastInvoice.sequenceNumber}</div>
                <div>Date: {new Date(lastInvoice.date).toLocaleString()}</div>
                <div>Method: {getMethodName(lastInvoice.paymentMethodId)}</div>
                {lastInvoice.amountTendered !== undefined && lastInvoice.paymentMethodId === paymentMethods.find(m => m.type === "cash")?.id && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    <div>Tendered: SAR {lastInvoice.amountTendered % 1 === 0 ? lastInvoice.amountTendered.toFixed(0) : lastInvoice.amountTendered.toFixed(2)}</div>
                    <div>Change: SAR {lastInvoice.changeAmount !== undefined ? (lastInvoice.changeAmount % 1 === 0 ? lastInvoice.changeAmount.toFixed(0) : lastInvoice.changeAmount.toFixed(2)) : "0"}</div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-dashed border-slate-300 pt-4 mb-4">
                {lastInvoice.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between mb-1">
                    <span>{item.quantity}x {getLocalizedField(item, "name", language)}</span>
                    <span>SAR {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-dashed border-slate-300 pt-4 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>{t.subtotal || "Subtotal"}</span><span>SAR {lastInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t.tax || "Tax"}</span><span>SAR {lastInvoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-200">
                  <span>{t.total || "Total"}</span><span>SAR {lastInvoice.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center" dir="ltr">
                <QRCodeSVG value={JSON.stringify({ i: lastInvoice.id, t: lastInvoice.total })} size={100} />
              </div>
              
              <div className="text-center text-slate-500 mt-6 pt-4 border-t border-dashed border-slate-300">
                {getLocalizedField(settings, "receiptFooter", language) || settings?.receiptFooter}
              </div>
            </div>

            {window.self !== window.top && (
              <div className="no-print mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold flex flex-col gap-1 leading-normal">
                <span>⚠️ Note for workspace preview:</span>
                <span className="font-normal text-amber-700">The browser blocks direct printing inside this sandboxed preview iframe. Please click the <strong>"Open in New Tab"</strong> button in the top-right corner or use the Shared App URL to print directly to your POS thermal printer!</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => window.print()} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold transition cursor-pointer">
                {t.print || "PRINT"}
              </button>
              <button onClick={() => setReceiptModalOpen(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow transition cursor-pointer">
                {t.newOrder || "NEW ORDER"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
