import './styles/global.css';
// Form control system — loaded globally so legacy `.form-input` markup and the
// <Input>/<Select>/<Textarea> components always share the same rules.
import './components/ui/Field.css';
import './styles/animations.css';
import './styles/rtl.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { I18nProvider } from './contexts/I18nContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { CategoriesProvider } from './contexts/CategoriesContext';
import { WishlistProvider } from './contexts/WishlistContext';
import App from './App';

// Apply the stored language/direction BEFORE the first paint. Doing this inside
// a React effect meant Arabic rendered left-to-right for one frame and then
// flipped, which was visible on every load.
(function applyStoredDirection() {
  try {
    const lang = localStorage.getItem('site_lang') || 'en';
    const rtl = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', rtl);
  } catch { /* storage blocked — default LTR from index.html stands */ }
})();

// Remove the branded loader once React mounts
const loader = document.getElementById('initialLoader');
if (loader) {
  loader.classList.add('fade-out');
  setTimeout(() => loader.remove(), 600);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <CurrencyProvider>
            <CategoriesProvider>
              <WishlistProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </WishlistProvider>
            </CategoriesProvider>
          </CurrencyProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
