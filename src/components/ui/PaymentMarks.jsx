/**
 * ARTÉVA Maison — payment method marks
 *
 * Generic, self-drawn marks rather than emoji. Emoji render differently on
 * every OS (and looked like clip-art next to the rest of the UI), so these are
 * flat monochrome-friendly SVGs on a common 40×28 card canvas.
 *
 * They are deliberately generic — no third-party trademarks are reproduced.
 */

const CARD = {
  width: 40,
  height: 28,
  viewBox: '0 0 40 28',
  fill: 'none',
  'aria-hidden': true,
  focusable: false,
};

function Plate({ children, ...rest }) {
  return (
    <svg {...CARD} {...rest}>
      <rect
        x="0.6" y="0.6" width="38.8" height="26.8" rx="4.4"
        fill="currentColor" fillOpacity="0.06"
        stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2"
      />
      {children}
    </svg>
  );
}

/** Credit / debit card — chip + magnetic stripe. */
export const CardMark = (p) => (
  <Plate {...p}>
    <rect x="0.6" y="6.4" width="38.8" height="4.6" fill="currentColor" fillOpacity="0.5" />
    <rect x="5" y="14.5" width="7.5" height="5.6" rx="1.4" fill="currentColor" fillOpacity="0.75" />
    <path d="M8.75 14.5v5.6M5 17.3h7.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.9" />
    <rect x="16" y="18" width="9" height="2.1" rx="1.05" fill="currentColor" fillOpacity="0.35" />
    <rect x="27" y="18" width="8" height="2.1" rx="1.05" fill="currentColor" fillOpacity="0.35" />
  </Plate>
);

/** KNET — Kuwait's national debit network; drawn as a bank-linked card. */
export const KnetMark = (p) => (
  <Plate {...p}>
    <path
      d="M20 6.2 27.5 10v1.3h-15V10L20 6.2Z"
      fill="currentColor" fillOpacity="0.7"
    />
    <path
      d="M14.4 12.6v5.6M18.2 12.6v5.6M21.8 12.6v5.6M25.6 12.6v5.6"
      stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round"
    />
    <rect x="12" y="19.4" width="16" height="2.2" rx="1.1" fill="currentColor" fillOpacity="0.7" />
  </Plate>
);

/** Buy now, pay later — instalments over time. */
export const BnplMark = (p) => (
  <Plate {...p}>
    <circle cx="13" cy="14" r="4.2" fill="currentColor" fillOpacity="0.55" />
    <circle cx="20" cy="14" r="4.2" fill="currentColor" fillOpacity="0.35" />
    <circle cx="27" cy="14" r="4.2" fill="currentColor" fillOpacity="0.18" />
    <path
      d="M10.5 21.4h19"
      stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.3" strokeLinecap="round"
    />
  </Plate>
);

/** Cash on delivery — banknote. */
export const CashMark = (p) => (
  <Plate {...p}>
    <rect
      x="6.5" y="8.5" width="27" height="14" rx="2.2"
      stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4"
    />
    <circle cx="20" cy="15.5" r="3.6" fill="currentColor" fillOpacity="0.55" />
    <path
      d="M10.2 12.2v6.6M29.8 12.2v6.6"
      stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round"
    />
  </Plate>
);

/** Apple Pay — generic wallet-on-device mark (no trademark reproduced). */
export const WalletMark = (p) => (
  <Plate {...p}>
    <rect
      x="13.5" y="5.8" width="13" height="16.4" rx="2.4"
      stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4"
    />
    <path d="M17.8 8.6h4.4" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
    <path
      d="M16.6 15.2h6.8M21 12.8l2.4 2.4-2.4 2.4"
      stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </Plate>
);

/** Address-type marks used by the checkout selector (also previously emoji). */
export const HomeMark = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false" {...p}>
    <path d="M4 10.2l8-6.2 8 6.2v9a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19.2z" />
    <path d="M9.4 20.6v-7.2h5.2v7.2" />
  </svg>
);

export const WorkMark = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false" {...p}>
    <rect x="4.5" y="7.5" width="15" height="13" rx="1.6" />
    <path d="M9 7.5V5.4a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 5.4v2.1" />
    <path d="M4.5 12.6h15" />
  </svg>
);

export const PinMark = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false" {...p}>
    <path d="M12 21s6.8-6.2 6.8-11A6.8 6.8 0 0 0 5.2 10c0 4.8 6.8 11 6.8 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const LockMark = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false" {...p}>
    <rect x="4.8" y="10.4" width="14.4" height="9.8" rx="2.2" />
    <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
  </svg>
);
