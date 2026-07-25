import { useState, useCallback, memo } from 'react';
import { usePromo } from '../../contexts/PromoContext';
import { useI18n } from '../../contexts/I18nContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { TagIcon, CheckIcon, CloseIcon } from '../ui/Icons';
import './PromoCodeField.css';

/**
 * Promo code entry, shared by the cart and checkout summaries.
 *
 * Two states, same as the vanilla markup it replaces: an input row before a
 * code is applied, and a compact "applied" chip after. The applied state shows
 * the saving so the shopper can see the code is doing something without
 * scanning the totals.
 */
function PromoCodeField({ compact = false }) {
  const { promo, applying, error, apply, remove, trackManualEntry, clearError } = usePromo();
  const { t } = useI18n();
  const { format } = useCurrency();
  const [value, setValue] = useState('');

  const submit = useCallback(async (e) => {
    e?.preventDefault();
    const code = value.trim();
    if (!code || applying) return;
    // Counted as a promo touch even if it turns out not to apply — otherwise
    // codes shared verbally would look like they drove no traffic at all.
    trackManualEntry(code);
    const result = await apply(code);
    if (result.ok) setValue('');
  }, [value, applying, apply, trackManualEntry]);

  if (promo) {
    return (
      <div className={`promo-field promo-field--applied ${compact ? 'is-compact' : ''}`}>
        <span className="promo-applied-icon" aria-hidden="true"><CheckIcon size={14} /></span>
        <div className="promo-applied-body">
          <code className="promo-applied-code">{promo.code}</code>
          <span className="promo-applied-saving">
            −{format(promo.totalDiscount)}
          </span>
        </div>
        <button
          type="button"
          className="promo-remove"
          onClick={remove}
          aria-label={`${t('remove')} ${promo.code}`}
        >
          <CloseIcon size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`promo-field ${compact ? 'is-compact' : ''}`}>
      <form className="promo-input-row" onSubmit={submit} noValidate>
        <span className="promo-input-icon" aria-hidden="true"><TagIcon size={15} /></span>
        <input
          type="text"
          className="promo-input"
          placeholder={t('promo_placeholder')}
          aria-label={t('promo_code')}
          value={value}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          onChange={e => {
            setValue(e.target.value.toUpperCase());
            if (error) clearError();
          }}
        />
        <button
          type="submit"
          className="promo-apply"
          disabled={applying || !value.trim()}
        >
          {applying ? '…' : t('apply')}
        </button>
      </form>

      {error && (
        <p className="promo-error" role="alert">{error}</p>
      )}
    </div>
  );
}

export default memo(PromoCodeField);
