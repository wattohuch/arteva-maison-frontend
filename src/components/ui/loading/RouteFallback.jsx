import { useEffect, useState } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import LuxuryLoader from './LuxuryLoader';

/* ============================================
   ARTÉVA Maison — Route fallback

   What a route slot holds while its chunk is in flight. It is deliberately
   nothing to look at: the page transition already covers a normal wait, and a
   loader that appears for 200ms is a flash, not reassurance.

   So the slot stays empty — reserving its height, which is the part that
   matters, since a collapsed slot pulls the footer up and shifts the page —
   and the loader only appears if the wait outlasts QUIET_MS.
   ============================================ */

const QUIET_MS = 420;

export default function RouteFallback() {
  const { t } = useI18n();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), QUIET_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="route-fallback">
      {slow && <LuxuryLoader size="inline" title={t('loading')} subtitle="" showProgress={false} />}
    </div>
  );
}
