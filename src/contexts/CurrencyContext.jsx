import { createContext, useContext, useState, useCallback } from 'react';

const RATES = { KWD: 1, SAR: 12.25, AED: 12.00, QAR: 12.00, BHD: 1.23, OMR: 1.26, USD: 3.25 };
const SYMBOLS = { KWD: 'KWD', SAR: 'SAR', AED: 'AED', QAR: 'QAR', BHD: 'BHD', OMR: 'OMR', USD: 'USD' };
const DECIMALS = { KWD: 3, SAR: 2, AED: 2, QAR: 2, BHD: 3, OMR: 3, USD: 2 };
const FLAGS = { KWD: 'kw', SAR: 'sa', AED: 'ae', QAR: 'qa', BHD: 'bh', OMR: 'om', USD: 'us' };
const NAMES = { KWD: 'Kuwaiti Dinar', SAR: 'Saudi Riyal', AED: 'UAE Dirham', QAR: 'Qatari Riyal', BHD: 'Bahraini Dinar', OMR: 'Omani Rial', USD: 'US Dollar' };

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() =>
    localStorage.getItem('arteva_currency') || 'KWD'
  );

  const setCurrency = useCallback((code) => {
    setCurrencyState(code);
    localStorage.setItem('arteva_currency', code);
  }, []);

  /** Convert from KWD (base) to selected currency */
  const convert = useCallback((kwdAmount) => {
    const rate = RATES[currency] || 1;
    return kwdAmount * rate;
  }, [currency]);

  /** Format a KWD amount in the selected currency */
  const format = useCallback((kwdAmount) => {
    const converted = convert(kwdAmount);
    const decimals = DECIMALS[currency] || 2;
    return `${converted.toFixed(decimals)} ${SYMBOLS[currency]}`;
  }, [currency, convert]);

  return (
    <CurrencyContext.Provider value={{
      currency, setCurrency, convert, format,
      rates: RATES, symbols: SYMBOLS, decimals: DECIMALS, flags: FLAGS, names: NAMES,
      currencies: Object.keys(RATES),
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
