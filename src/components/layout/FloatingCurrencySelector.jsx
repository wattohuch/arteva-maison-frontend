import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import './FloatingCurrencySelector.css';

export default function FloatingCurrencySelector() {
  const { currency, setCurrency, currencies, flags, names } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="floating-currency-wrap" ref={containerRef}>
      {isOpen && (
        <div className="floating-currency-menu animate-fade-in-up">
          <div className="floating-currency-title">Select Currency</div>
          {currencies.map(code => (
            <button
              key={code}
              className={`floating-currency-item ${code === currency ? 'active' : ''}`}
              onClick={() => {
                setCurrency(code);
                setIsOpen(false);
              }}
            >
              <span className={`fi fi-${flags[code]} currency-flag-icon`} />
              <span className="currency-code">{code}</span>
              <span className="currency-name">{names[code]}</span>
            </button>
          ))}
        </div>
      )}

      <button
        className="floating-currency-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Currency Selector"
      >
        <span className={`fi fi-${flags[currency]} currency-flag-icon`} />
        <span className="currency-btn-code">{currency}</span>
        <svg
          className={`currency-chevron ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
}
