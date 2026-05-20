import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { POS } from "./pages/POS";
import { Transactions } from "./pages/Transactions";
import { Categories } from "./pages/Categories";
import { Products } from "./pages/Products";
import { PaymentMethods } from "./pages/PaymentMethods";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<POS />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="products" element={<Products />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
