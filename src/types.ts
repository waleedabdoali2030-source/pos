export interface Setting {
  id?: string;
  storeName: string;
  storeNameAr?: string;
  storeNameBn?: string;
  phone: string;
  address: string;
  addressAr?: string;
  addressBn?: string;
  taxNumber?: string;
  taxRate: number;
  receiptHeader: string;
  receiptHeaderAr?: string;
  receiptHeaderBn?: string;
  receiptFooter: string;
  receiptFooterAr?: string;
  receiptFooterBn?: string;
  updatedAt: number;
}

export interface PaymentMethod {
  id?: string;
  name: string;
  nameAr?: string;
  nameBn?: string;
  type: 'cash' | 'mada' | 'other';
  icon: string;
  color: string;
  isActive: boolean;
  updatedAt: number;
}

export interface Category {
  id?: string;
  name: string;
  nameAr?: string;
  nameBn?: string;
  color: string;
  updatedAt: number;
}

export interface Product {
  id?: string;
  name: string;
  nameAr?: string;
  nameBn?: string;
  categoryId: string;
  price: number;
  barcode: string;
  updatedAt: number;
}

export interface DaySession {
  id?: string;
  startTime: number;
  endTime: number | null;
  status: 'open' | 'closed';
  totalSales: number;
  totalCash?: number;
  totalCard?: number;
  totalInvoices: number;
  invoiceSequenceStart: number; // to calculate 1 to N correctly
}

export interface InvoiceItem {
  productId: string;
  name: string;
  nameAr?: string;
  nameBn?: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id?: string;
  sequenceNumber: number;
  sessionId: string;
  date: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountTendered?: number;
  changeAmount?: number;
  paymentMethodId: string;
  items: InvoiceItem[];
}
