import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, orderBy, where, doc, getDoc } from "firebase/firestore";
import { useStore } from "../store/useStore";
import { Invoice, DaySession, PaymentMethod, Setting } from "../types";
import { Search, Printer, Calendar, CalendarOff, Receipt as ReceiptIcon } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { translations, getLocalizedField } from "../lib/translations";

export function Transactions() {
  const { firebaseUser, session, language } = useStore();
  const t = translations[language] || translations.en;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterSession, setFilterSession] = useState<string>("all");
  
  const [activeTab, setActiveTab] = useState<"invoices" | "sessions">("invoices");
  
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DaySession | null>(null);

  useEffect(() => {
    if (session && session.status === "open") {
      setFilterSession("current");
    } else {
      setFilterSession("all");
    }
  }, [session]);

  useEffect(() => {
    if (!firebaseUser) return;
    const loadData = async () => {
      // Load Settings
      const setSnap = await getDocs(collection(db, "users", firebaseUser.uid, "settings"));
      if (!setSnap.empty) setSettings(setSnap.docs[0].data() as Setting);

      // Load Methods
      const mSnap = await getDocs(query(collection(db, "users", firebaseUser.uid, "payment_methods")));
      setPaymentMethods(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod)));

      // Load Invoices
      const iSnap = await getDocs(query(collection(db, "users", firebaseUser.uid, "invoices"), orderBy("date", "desc")));
      setInvoices(iSnap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));

      // Load Sessions
      const sSnap = await getDocs(query(collection(db, "users", firebaseUser.uid, "day_sessions"), orderBy("startTime", "desc")));
      setSessions(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as DaySession)));
    };
    loadData();
  }, [firebaseUser]);

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = search === "" || inv.sequenceNumber.toString().includes(search) || inv.id?.includes(search);
    const matchDate = filterDate === "" || format(new Date(inv.date), "yyyy-MM-dd") === filterDate;
    const matchMethod = filterMethod === "all" || inv.paymentMethodId === filterMethod;
    
    let matchSession = true;
    if (filterSession === "current") {
      matchSession = inv.sessionId === session?.id;
    } else if (filterSession !== "all") {
      matchSession = inv.sessionId === filterSession;
    }

    return matchSearch && matchDate && matchMethod && matchSession;
  });

  const getMethodName = (id: string) => {
    const pm = paymentMethods.find(m => m.id === id);
    return pm ? getLocalizedField(pm, "name", language) : "Unknown";
  };

  const handleReprint = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setReceiptModalOpen(true);
  };

  return (
    <div className="card p-0 overflow-hidden h-[calc(100vh-140px)] flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 shrink-0">
        <button onClick={() => setActiveTab("invoices")} className={`px-4 py-2 font-medium rounded-lg transition-colors cursor-pointer ${activeTab === "invoices" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}>
          {language === "ar" ? "الفواتير" : language === "bn" ? "ইনভয়েস সমূহ" : "Invoices"}
        </button>
        <button onClick={() => setActiveTab("sessions")} className={`px-4 py-2 font-medium rounded-lg transition-colors cursor-pointer ${activeTab === "sessions" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}>
          {t.daySummaryReport || "Day Summaries"}
        </button>
      </div>

      {activeTab === "invoices" && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap gap-4 shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={t.searchInvoices || "Search invoices..."} 
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input 
              type="date" 
              value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            />
            <select 
              value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="all">{language === "ar" ? "جميع طرق الدفع" : language === "bn" ? "সব পেমেন্ট পদ্ধতি" : "All Methods"}</option>
              {paymentMethods.map(m => <option key={m.id} value={m.id}>{getLocalizedField(m, "name", language)}</option>)}
            </select>
            <select 
              value={filterSession} onChange={(e) => setFilterSession(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="all">{t.allDaySessions || "All Day Sessions"}</option>
              {session && session.status === "open" && (
                <option value="current">{t.activeSession || "Active Session"}</option>
              )}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.status === 'open' ? (t.activeSession || 'Active Session') : (t.closedDay || 'Closed Day')} ({format(new Date(s.startTime), "MMM d, HH:mm")})
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                <tr className="text-slate-500">
                  <th className="font-medium p-4 text-center">{language === "ar" ? "رقم الفاتورة" : "Inv #"}</th>
                  <th className="font-medium p-4">{language === "ar" ? "التاريخ" : "Date"}</th>
                  <th className="font-medium p-4">{language === "ar" ? "طريقة الدفع" : "Payment Method"}</th>
                  <th className="font-medium p-4 text-right">{t.total || "Total"}</th>
                  <th className="font-medium p-4 text-right">{t.actions || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-800 text-center">{inv.sequenceNumber}</td>
                    <td className="p-4 text-slate-600">{format(new Date(inv.date), "PP p")}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                        {getMethodName(inv.paymentMethodId).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-right text-slate-800">SAR {inv.total.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleReprint(inv)} className="text-slate-500 hover:text-blue-600 p-2 rounded-lg transition-colors hover:bg-blue-50 inline-flex cursor-pointer animate-pulse-soft">
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500">
                    {language === "ar" ? "لا توجد فواتير مطابقة لخيارات البحث." : "No invoices found matching criteria."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="flex flex-col h-full overflow-hidden">
          {sessions.length > 0 && sessions[0].status === 'open' && (
            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">
                {language === "ar" ? "ملخص يوم العمل الحالي المفتوح" : "Current Open Day Summary"}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-500 font-medium mb-1">{t.totalSales || "Total Sales"}</div>
                  <div className="text-2xl font-bold text-slate-900">SAR {sessions[0].totalSales.toFixed(2)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-500 font-medium mb-1">{t.cashSales || "Cash"}</div>
                  <div className="text-2xl font-bold text-emerald-600">SAR {(sessions[0].totalCash || 0).toFixed(2)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-500 font-medium mb-1">{t.cardSales || "Card"}</div>
                  <div className="text-2xl font-bold text-blue-600">SAR {(sessions[0].totalCard || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
              <tr className="text-slate-500">
                <th className="font-medium p-4">{t.status || "Status"}</th>
                <th className="font-medium p-4">{t.openedAt || "Opened At"}</th>
                <th className="font-medium p-4 text-center">{t.totalInvoices || "Invoices"}</th>
                <th className="font-medium p-4 text-right">{t.cashSales || "Cash"}</th>
                <th className="font-medium p-4 text-right">{t.cardSales || "Card"}</th>
                <th className="font-medium p-4 text-right">{t.totalSales || "Total Sales"}</th>
                <th className="font-medium p-4 text-right">{t.actions || "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sess.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {sess.status === 'open' ? (t.activeSession || 'OPEN') : (t.closedDay || 'CLOSED')}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="font-medium">{format(new Date(sess.startTime), "PP p")}</div>
                    {sess.endTime && <div className="text-xs text-slate-400">{t.closedAt || "Closed"}: {format(new Date(sess.endTime), "PP p")}</div>}
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-slate-800">{sess.totalInvoices}</td>
                  <td className="p-4 text-right font-medium text-slate-600 text-sm">{sess.totalCash ? `SAR ${sess.totalCash.toFixed(2)}` : '-'}</td>
                  <td className="p-4 text-right font-medium text-slate-600 text-sm">{sess.totalCard ? `SAR ${sess.totalCard.toFixed(2)}` : '-'}</td>
                  <td className="p-4 text-right font-bold text-slate-800">SAR {sess.totalSales.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    {sess.status === 'closed' && (
                      <button 
                        onClick={() => {
                          setSelectedSession(sess);
                          setSessionModalOpen(true);
                        }} 
                        className="text-slate-500 hover:text-blue-600 p-2 rounded-lg transition-colors hover:bg-blue-50 inline-flex cursor-pointer animate-pulse-soft"
                        title="Print Day Summary"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-slate-500">No day sessions found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Reprint Receipt Modal */}
      {receiptModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl relative" dir={language === "ar" ? "rtl" : "ltr"}>
            
            <div className="receipt-paper mb-6 font-mono text-sm" dir={language === "ar" ? "rtl" : "ltr"}>
              <div className="text-center text-xs bg-slate-200 text-slate-600 rounded-full w-max mx-auto px-2 py-0.5 mb-4">{t.reprint || "REPRINT"}</div>
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
                <div>Inv #: {selectedInvoice.sequenceNumber}</div>
                <div>Date: {format(new Date(selectedInvoice.date), "PP p")}</div>
                <div>Method: {getMethodName(selectedInvoice.paymentMethodId)}</div>
                {selectedInvoice.amountTendered !== undefined && selectedInvoice.paymentMethodId === paymentMethods.find(m => m.type === 'cash')?.id && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    <div>Tendered: SAR {selectedInvoice.amountTendered % 1 === 0 ? selectedInvoice.amountTendered.toFixed(0) : selectedInvoice.amountTendered.toFixed(2)}</div>
                    <div>Change: SAR {selectedInvoice.changeAmount !== undefined ? (selectedInvoice.changeAmount % 1 === 0 ? selectedInvoice.changeAmount.toFixed(0) : selectedInvoice.changeAmount.toFixed(2)) : "0"}</div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-dashed border-slate-300 pt-4 mb-4">
                {selectedInvoice.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between mb-1">
                    <span>{item.quantity}x {getLocalizedField(item, "name", language)}</span>
                    <span>SAR {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-dashed border-slate-300 pt-4 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>{t.subtotal || "Subtotal"}</span><span>SAR {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t.tax || "Tax"}</span><span>SAR {selectedInvoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-200">
                  <span>{t.total || "Total"}</span><span>SAR {selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center" dir="ltr">
                <QRCodeSVG value={JSON.stringify({ i: selectedInvoice.id, t: selectedInvoice.total })} size={100} />
              </div>
              
              <div className="text-center text-slate-500 mt-6 pt-4 border-t border-dashed border-slate-300">
                {getLocalizedField(settings, "receiptFooter", language) || settings?.receiptFooter}
              </div>
            </div>

            {window.self !== window.top && (
              <div className="no-print mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-805 text-[11px] font-semibold flex flex-col gap-1 leading-normal text-left">
                <span>⚠️ Note for workspace preview:</span>
                <span className="font-normal text-amber-700">The browser blocks direct printing inside this sandboxed preview iframe. Please click the <strong>"Open in New Tab"</strong> button in the top-right corner or use the Shared App URL to print directly to your POS thermal printer!</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setReceiptModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold transition cursor-pointer">
                {t.close || "CLOSE"}
              </button>
              <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow transition cursor-pointer">
                {t.print || "PRINT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Session Summary Modal */}
      {sessionModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl relative" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="receipt-paper mb-6 font-mono text-sm" dir={language === "ar" ? "rtl" : "ltr"}>
              <div className="text-center text-xs bg-slate-200 text-slate-600 rounded-full w-max mx-auto px-2 py-0.5 mb-4">{t.dayReport || "DAY REPORT"}</div>
              <div className="text-center font-bold text-lg mb-2">
                {getLocalizedField(settings, "storeName", language) || settings?.storeName || "WALEED POS"}
              </div>
              <div className="text-center text-slate-500 mb-6 pb-4 border-b border-dashed border-slate-300 text-xs">
                <div className="font-bold text-slate-800 text-sm">{t.daySummaryReport || "DAY SUMMARY REPORT"}</div>
                {(getLocalizedField(settings, "address", language) || settings?.address) && <div>{getLocalizedField(settings, "address", language) || settings?.address}</div>}
                {settings?.taxNumber && <div>Tax No: {settings.taxNumber}</div>}
              </div>
              
              <div className="space-y-2 pb-4 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.status || "Status"}:</span>
                  <span className="font-bold uppercase text-rose-600">{selectedSession.status}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500">{t.openedAt || "Opened At"}:</span>
                  <span className="font-medium">{format(new Date(selectedSession.startTime), "PP p")}</span>
                </div>
                {selectedSession.endTime && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">{t.closedAt || "Closed At"}:</span>
                    <span className="font-medium">{format(new Date(selectedSession.endTime), "PP p")}</span>
                  </div>
                )}
              </div>

              <div className="py-4 space-y-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.totalInvoices || "Total Invoices"}:</span>
                  <span className="font-bold">{selectedSession.totalInvoices}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t.cashSales || "Cash Sales"}:</span>
                  <span>SAR {(selectedSession.totalCash || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t.cardSales || "Card Sales"}:</span>
                  <span>SAR {(selectedSession.totalCard || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 space-y-1">
                <div className="flex justify-between font-bold text-lg mt-1">
                  <span>{t.totalSales || "Total Sales"}:</span>
                  <span>SAR {selectedSession.totalSales.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-slate-500 mt-8 pt-4 border-t border-dashed border-slate-300 text-xs">
                WALEED POS - SUMMARY REPORT
              </div>
            </div>

            {window.self !== window.top && (
              <div className="no-print mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-805 text-[11px] font-semibold flex flex-col gap-1 leading-normal text-left">
                <span>⚠️ Note for workspace preview:</span>
                <span className="font-normal text-amber-700">The browser blocks direct printing inside this sandboxed preview iframe. Please click the <strong>"Open in New Tab"</strong> button in the top-right corner or use the Shared App URL to print directly to your POS thermal printer!</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setSessionModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold transition cursor-pointer">
                {t.close || "CLOSE"}
              </button>
              <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow transition cursor-pointer">
                {t.print || "PRINT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
