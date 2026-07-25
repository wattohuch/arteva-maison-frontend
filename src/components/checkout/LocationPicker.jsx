import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { PinMark } from '../ui/PaymentMarks';
import './LocationPicker.css';

/**
 * Interactive delivery-location picker.
 *
 * Renders an OpenStreetMap raster-tile map with a draggable pin, resolves the
 * dropped point to a street address via Nominatim, and hands `{lat, lng}` plus
 * the resolved address back to the checkout form.
 *
 * Deliberately dependency-free: tiles are plain <img> elements on a transform
 * layer rather than a mapping library, so nothing is added to the bundle and
 * there is no script to fail under CSP. Every network call is optional — if
 * tiles or geocoding are blocked the component degrades to manual coordinate
 * entry and checkout continues to work.
 */

const TILE_SIZE = 256;
const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;

// Kuwait City — sensible default for the store's delivery area.
const DEFAULT_CENTER = { lat: 29.3759, lng: 47.9774 };

const TILE_URL = (x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const NOMINATIM = 'https://nominatim.openstreetmap.org';

/* ── Web-mercator helpers (pixel space at a given zoom) ── */
const lngToX = (lng, z) => ((lng + 180) / 360) * TILE_SIZE * 2 ** z;
const latToY = (lat, z) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE_SIZE * 2 ** z;
};
const xToLng = (x, z) => (x / (TILE_SIZE * 2 ** z)) * 360 - 180;
const yToLat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * 2 ** z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

export default function LocationPicker({ value, onChange, onAddressResolved }) {
  const { t, lang } = useI18n();

  const hasValue = Number.isFinite(value?.lat) && Number.isFinite(value?.lng)
    && (value.lat !== 0 || value.lng !== 0);

  const [center, setCenter] = useState(hasValue ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER);
  const [zoom, setZoom] = useState(hasValue ? 16 : DEFAULT_ZOOM);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState('');
  const [notice, setNotice] = useState('');

  const viewportRef = useRef(null);
  const dragState = useRef(null);
  const tileErrors = useRef(0);
  const reverseTimer = useRef(null);
  const reverseAbort = useRef(null);

  /* Track viewport size so the tile grid covers it exactly. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.ceil(width), h: Math.ceil(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Keep the map in sync when the parent supplies coordinates (saved address). */
  useEffect(() => {
    if (!hasValue) return;
    setCenter(prev =>
      Math.abs(prev.lat - value.lat) < 1e-7 && Math.abs(prev.lng - value.lng) < 1e-7
        ? prev
        : { lat: value.lat, lng: value.lng }
    );
  }, [hasValue, value?.lat, value?.lng]);

  /* ── Reverse geocode, debounced, cancellable ── */
  const reverseGeocode = useCallback((lat, lng) => {
    clearTimeout(reverseTimer.current);
    reverseAbort.current?.abort();

    reverseTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      reverseAbort.current = controller;
      setResolving(true);
      try {
        const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
          `&accept-language=${lang === 'ar' ? 'ar' : 'en'}`;
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const a = data.address || {};

        setResolvedLabel(data.display_name || '');
        onAddressResolved?.({
          street: [a.road, a.house_number].filter(Boolean).join(' ') || a.neighbourhood || '',
          city: a.city || a.town || a.village || a.state_district || '',
          state: a.suburb || a.neighbourhood || a.state || '',
          country: a.country || '',
          zipCode: a.postcode || '',
          displayName: data.display_name || '',
        });
        setNotice('');
      } catch (err) {
        if (err.name === 'AbortError') return;
        // Geocoding is a convenience; the pin coordinates are what actually ship.
        setResolvedLabel('');
        setNotice(t('map_address_lookup_failed'));
      } finally {
        setResolving(false);
      }
    }, 600);
  }, [lang, onAddressResolved, t]);

  useEffect(() => () => {
    clearTimeout(reverseTimer.current);
    reverseAbort.current?.abort();
  }, []);

  /** Commits a new pin position upward and kicks off address resolution. */
  const commit = useCallback((lat, lng) => {
    const round = (n) => Math.round(n * 1e6) / 1e6;
    onChange?.({ lat: round(lat), lng: round(lng) });
    reverseGeocode(round(lat), round(lng));
  }, [onChange, reverseGeocode]);

  /* ── Pointer drag: pans the map; the pin stays fixed at the centre ── */
  const onPointerDown = (e) => {
    if (tilesFailed) return;
    const el = viewportRef.current;
    el?.setPointerCapture?.(e.pointerId);
    dragState.current = { x: e.clientX, y: e.clientY, center };
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const st = dragState.current;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    const cx = lngToX(st.center.lng, zoom) - dx;
    const cy = latToY(st.center.lat, zoom) - dy;
    setCenter({ lat: yToLat(cy, zoom), lng: xToLng(cx, zoom) });
  };

  const endDrag = (e) => {
    if (!dragState.current) return;
    viewportRef.current?.releasePointerCapture?.(e.pointerId);
    dragState.current = null;
    setDragging(false);
    commit(center.lat, center.lng);
  };

  /* ── Keyboard panning for non-pointer users ── */
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 60 : 20;
    const moves = {
      ArrowUp: [0, -step], ArrowDown: [0, step],
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      const cx = lngToX(center.lng, zoom) + dx;
      const cy = latToY(center.lat, zoom) + dy;
      const next = { lat: yToLat(cy, zoom), lng: xToLng(cx, zoom) };
      setCenter(next);
      commit(next.lat, next.lng);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault(); setZoom(z => Math.min(MAX_ZOOM, z + 1));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault(); setZoom(z => Math.max(MIN_ZOOM, z - 1));
    }
  };

  /* ── Device location ── */
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice(t('map_geolocation_unsupported'));
      return;
    }
    setLocating(true);
    setNotice('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenter({ lat: latitude, lng: longitude });
        setZoom(17);
        commit(latitude, longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setNotice(t('map_geolocation_denied'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  /* ── Tile grid ── */
  const tiles = [];
  if (size.w && size.h && !tilesFailed) {
    const cx = lngToX(center.lng, zoom);
    const cy = latToY(center.lat, zoom);
    const originX = cx - size.w / 2;
    const originY = cy - size.h / 2;
    const startCol = Math.floor(originX / TILE_SIZE);
    const startRow = Math.floor(originY / TILE_SIZE);
    const cols = Math.ceil(size.w / TILE_SIZE) + 2;
    const rows = Math.ceil(size.h / TILE_SIZE) + 2;
    const max = 2 ** zoom;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const col = startCol + c;
        const row = startRow + r;
        if (row < 0 || row >= max) continue;
        const wrapped = ((col % max) + max) % max;
        tiles.push({
          key: `${zoom}/${wrapped}/${row}`,
          src: TILE_URL(wrapped, row, zoom),
          left: col * TILE_SIZE - originX,
          top: row * TILE_SIZE - originY,
        });
      }
    }
  }

  const handleTileError = () => {
    tileErrors.current += 1;
    // A handful of misses is normal at the edges; a sustained failure means the
    // tile host is blocked, so switch to the manual fallback.
    if (tileErrors.current > 8) setTilesFailed(true);
  };

  const coordText = hasValue
    ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
    : t('map_no_pin');

  return (
    <div className="locpick">
      <div className="locpick-head">
        <div>
          <span className="field-label locpick-title">{t('delivery_location')}</span>
          <p className="locpick-hint">{t('map_hint')}</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? t('locating') : t('use_current_location')}
        </button>
      </div>

      {tilesFailed ? (
        /* ── Fallback: map tiles unreachable ── */
        <div className="locpick-fallback">
          <span className="locpick-fallback-icon"><PinMark /></span>
          <p>{t('map_unavailable')}</p>
          <div className="field-row locpick-manual">
            <label className="field field-sm">
              <span className="field-label">{t('latitude')}</span>
              <input
                className="control" type="number" step="0.000001" inputMode="decimal"
                value={hasValue ? value.lat : ''}
                onChange={e => onChange?.({ lat: parseFloat(e.target.value) || 0, lng: value?.lng || 0 })}
              />
            </label>
            <label className="field field-sm">
              <span className="field-label">{t('longitude')}</span>
              <input
                className="control" type="number" step="0.000001" inputMode="decimal"
                value={hasValue ? value.lng : ''}
                onChange={e => onChange?.({ lat: value?.lat || 0, lng: parseFloat(e.target.value) || 0 })}
              />
            </label>
          </div>
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={`locpick-map ${dragging ? 'is-dragging' : ''}`}
          role="application"
          aria-label={t('delivery_location')}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          <div className="locpick-tiles" aria-hidden="true">
            {tiles.map(tile => (
              <img
                key={tile.key}
                src={tile.src}
                alt=""
                width={TILE_SIZE}
                height={TILE_SIZE}
                loading="lazy"
                draggable={false}
                onError={handleTileError}
                style={{ transform: `translate3d(${tile.left}px, ${tile.top}px, 0)` }}
              />
            ))}
          </div>

          {/* Pin is fixed at the optical centre; the map moves beneath it. */}
          <div className="locpick-pin" aria-hidden="true">
            <PinMark />
            <span className="locpick-pin-shadow" />
          </div>

          <div className="locpick-zoom">
            <button type="button" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 1))}
              disabled={zoom >= MAX_ZOOM} aria-label={t('zoom_in')}>+</button>
            <button type="button" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 1))}
              disabled={zoom <= MIN_ZOOM} aria-label={t('zoom_out')}>−</button>
          </div>

          <span className="locpick-attribution">© OpenStreetMap</span>
        </div>
      )}

      <div className="locpick-readout" aria-live="polite">
        <span className="locpick-coords">{coordText}</span>
        {resolving && <span className="locpick-resolving">{t('resolving_address')}</span>}
        {!resolving && resolvedLabel && (
          <span className="locpick-address" title={resolvedLabel}>{resolvedLabel}</span>
        )}
      </div>

      {notice && <p className="field-message field-hint locpick-notice">{notice}</p>}
    </div>
  );
}
