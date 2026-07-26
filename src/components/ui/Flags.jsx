/* ============================================
   ARTÉVA Maison — Currency flags

   These replace the flag-icons CDN stylesheet, which was a render-blocking
   request to jsDelivr on every page load of the entire site — for the seven
   flags in the currency selector, one of which is visible at a time.

   Drawn at 20×14 and deliberately simplified: Saudi script and the Omani
   emblem are illegible at this size either way, so they are reduced to the
   marks that actually distinguish the flag at a glance.
   ============================================ */

const FLAGS = {
  kw: (
    <>
      <rect width="20" height="4.67" fill="#007A3D" />
      <rect y="4.67" width="20" height="4.66" fill="#FFFFFF" />
      <rect y="9.33" width="20" height="4.67" fill="#CE1126" />
      <path d="M0 0h6.2L4.4 4.67v4.66L6.2 14H0z" fill="#000000" />
    </>
  ),
  sa: (
    <>
      <rect width="20" height="14" fill="#006C35" />
      <rect x="4" y="4.4" width="12" height="1.5" rx="0.5" fill="#FFFFFF" />
      <rect x="4" y="8.4" width="12" height="1" rx="0.5" fill="#FFFFFF" />
      <path d="M4 9.9h1.4v1.2H4z" fill="#FFFFFF" />
    </>
  ),
  ae: (
    <>
      <rect width="20" height="4.67" fill="#00732F" />
      <rect y="4.67" width="20" height="4.66" fill="#FFFFFF" />
      <rect y="9.33" width="20" height="4.67" fill="#000000" />
      <rect width="5" height="14" fill="#FF0000" />
    </>
  ),
  qa: (
    <>
      <rect width="20" height="14" fill="#8D1B3D" />
      <path d="M0 0h5.2l2.3 1.56-2.3 1.55 2.3 1.56-2.3 1.55 2.3 1.56-2.3 1.55 2.3 1.56-2.3 1.55L5.2 14H0z" fill="#FFFFFF" />
    </>
  ),
  bh: (
    <>
      <rect width="20" height="14" fill="#CE1126" />
      <path d="M0 0h6.6l3 1.75-3 1.75 3 1.75-3 1.75 3 1.75-3 1.75 3 1.75-3 1.75H0z" fill="#FFFFFF" />
    </>
  ),
  om: (
    <>
      <rect width="20" height="4.67" fill="#FFFFFF" />
      <rect y="4.67" width="20" height="4.66" fill="#DB161B" />
      <rect y="9.33" width="20" height="4.67" fill="#008000" />
      <rect width="5.6" height="14" fill="#DB161B" />
      <path d="M2.1 3.2h1.4v3.4H2.1z" fill="#FFFFFF" opacity="0.9" />
    </>
  ),
  us: (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      {[0, 2, 4, 6].map(i => (
        <rect key={i} y={i * 2.15} width="20" height="1.08" fill="#B22234" />
      ))}
      {[0, 1, 2, 3].map(i => (
        <rect key={`b${i}`} y={i * 2.15 + 1.08} width="20" height="1.07" fill="#FFFFFF" />
      ))}
      <rect y="8.6" width="20" height="1.08" fill="#B22234" />
      <rect y="10.75" width="20" height="1.08" fill="#B22234" />
      <rect y="12.9" width="20" height="1.1" fill="#B22234" />
      <rect width="8.4" height="7.54" fill="#3C3B6E" />
    </>
  ),
};

/** @param {{ code: string, className?: string }} props ISO 3166-1 alpha-2, lowercase. */
export default function Flag({ code, className = '' }) {
  const art = FLAGS[code];
  if (!art) return null;

  return (
    <svg
      className={`flag ${className}`.trim()}
      viewBox="0 0 20 14"
      width="20"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      {art}
    </svg>
  );
}
