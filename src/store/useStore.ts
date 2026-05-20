import { create } from 'zustand';
import { User } from 'firebase/auth';
import { InvoiceItem, DaySession } from '../types';
import { Language } from '../lib/translations';

interface AppState {
  firebaseUser: User | null;
  setFirebaseUser: (user: User | null) => void;
  
  session: DaySession | null;
  setSession: (session: DaySession | null) => void;

  terminalUnlocked: boolean;
  unlockTerminal: (pin: string) => boolean;
  lockTerminal: () => void;

  cart: InvoiceItem[];
  addToCart: (item: InvoiceItem) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateQuantity: (productId: string, quantity: number) => void;

  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useStore = create<AppState>((set) => ({
  firebaseUser: null,
  setFirebaseUser: (user) => set({ firebaseUser: user }),

  session: null,
  setSession: (session) => set({ session }),

  terminalUnlocked: false,
  unlockTerminal: (pin: string) => {
    if (pin === '123') {
      set({ terminalUnlocked: true });
      return true;
    }
    return false;
  },
  lockTerminal: () => set({ terminalUnlocked: false }),

  cart: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(i => i.productId === item.productId);
    if (existing) {
      return {
        cart: state.cart.map(i => i.productId === item.productId 
          ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price } 
          : i)
      };
    }
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter(i => i.productId !== productId)
  })),
  clearCart: () => set({ cart: [] }),
  updateQuantity: (productId, quantity) => set((state) => ({
    cart: state.cart.map(i => i.productId === productId 
      ? { ...i, quantity, total: quantity * i.price } 
      : i)
  })),

  language: (localStorage.getItem('pos_language') as Language) || 'en',
  setLanguage: (lang) => {
    localStorage.setItem('pos_language', lang);
    set({ language: lang });
  },
}));
