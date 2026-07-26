import './LuxuryLoader.css';

/* ============================================
   ARTÉVA Maison — Luxury loader

   One gold arc, a trail of dots that fall away behind its head, and the house
   mark breathing at the centre. Every part of it is a single rigid rotor plus
   two slow, out-of-phase pulses, so nothing ever ticks or resets — the wait is
   something to look at rather than something to sit through.

   Only `opacity` and `transform` animate. Nothing here can trigger layout.
   ============================================ */

/** Dots trailing the arc's head — largest and brightest nearest the light. */
const TRAIL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * The house mark: a quatrefoil inside a soft arabesque frame, drawn rather
 * than shipped as an image so it stays crisp and can be lit from CSS.
 */
export function ArtevaMark() {
  return (
    <svg
      className="lux-mark"
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      focusable="false"
    >
      {/* The whisper of an ogee arch behind the petals. */}
      <path
        className="lux-mark__frame"
        d="M0,-50 C13,-33 27,-27 40,-19 C48,-13 48,13 40,19
           C27,27 13,33 0,50 C-13,33 -27,27 -40,19
           C-48,13 -48,-13 -40,-19 C-27,-27 -13,-33 0,-50 Z"
      />
      <g className="lux-mark__petals">
        <path d="M0,0 C8.5,-9 8.5,-21 0,-29 C-8.5,-21 -8.5,-9 0,0 Z" />
        <path
          d="M0,0 C8.5,-9 8.5,-21 0,-29 C-8.5,-21 -8.5,-9 0,0 Z"
          transform="rotate(90)"
        />
        <path
          d="M0,0 C8.5,-9 8.5,-21 0,-29 C-8.5,-21 -8.5,-9 0,0 Z"
          transform="rotate(180)"
        />
        <path
          d="M0,0 C8.5,-9 8.5,-21 0,-29 C-8.5,-21 -8.5,-9 0,0 Z"
          transform="rotate(270)"
        />
      </g>
      <path className="lux-mark__core" d="M0,-7 L7,0 L0,7 L-7,0 Z" />
    </svg>
  );
}

/**
 * @param {'screen'|'inline'} size  `screen` for the full loading screen,
 *   `inline` for a section waiting on its own data.
 */
export default function LuxuryLoader({
  title = 'Loading…',
  subtitle = 'Please wait',
  size = 'screen',
  showProgress = true,
  className = '',
}) {
  return (
    <div className={`lux-loader lux-loader--${size} ${className}`.trim()}>
      <div className="lux-loader__orbit">
        <span className="lux-loader__track" aria-hidden="true" />
        <span className="lux-loader__halo" aria-hidden="true" />

        {/* Arc, its lit head and the trailing dots turn as one body — that is
            what keeps the motion free of the wobble a group of independently
            animated dots always develops. */}
        <span className="lux-loader__rotor" aria-hidden="true">
          <span className="lux-loader__arc" />
          <span className="lux-loader__head" />
          <span className="lux-loader__trail">
            {TRAIL.map((i) => <i key={i} style={{ '--i': i }} />)}
          </span>
        </span>

        <span className="lux-loader__mark" aria-hidden="true">
          <ArtevaMark />
          <span className="lux-loader__shimmer" />
        </span>
      </div>

      {title && <p className="lux-loader__title">{title}</p>}
      {subtitle && <p className="lux-loader__subtitle">{subtitle}</p>}
      {showProgress && (
        <div className="lux-loader__progress" aria-hidden="true"><span /></div>
      )}
    </div>
  );
}
