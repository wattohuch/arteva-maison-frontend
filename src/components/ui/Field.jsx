import { forwardRef, useId } from 'react';
import { ChevronDownIcon } from './Icons';
import './Field.css';

/**
 * ARTÉVA Maison — form controls
 *
 * One implementation for every text input, select and textarea in the app.
 * Height, radius, padding, typography, placeholder, focus ring, error, disabled
 * and hover states all live in Field.css, so nothing can drift page to page.
 *
 * Usage:
 *   <Input label="City" name="city" value={v} onChange={fn} required />
 *   <Select label="Country" options={[{value,label}]} … />
 *   <Textarea label="Notes" rows={3} … />
 */

/** Shared label + error + hint chrome. */
function FieldShell({ id, label, error, hint, required, className = '', children, htmlFor }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor || id}>
          {label}
          {required && <span className="field-required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field-message field-error" id={`${id}-error`} role="alert">{error}</p>
      ) : hint ? (
        <p className="field-message field-hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Describedby target so screen readers announce the error or hint. */
function describedBy(id, error, hint) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, className, wrapperClassName, icon, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp || `in-${autoId}`;

  return (
    <FieldShell
      id={id} label={label} error={error} hint={hint}
      required={required} className={wrapperClassName}
    >
      <div className={`control-wrap ${icon ? 'has-icon' : ''}`}>
        {icon && <span className="control-icon">{icon}</span>}
        <input
          ref={ref}
          id={id}
          className={`control ${className || ''}`}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, wrapperClassName, options, children, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp || `sel-${autoId}`;

  return (
    <FieldShell
      id={id} label={label} error={error} hint={hint}
      required={required} className={wrapperClassName}
    >
      <div className="control-wrap has-affix">
        <select
          ref={ref}
          id={id}
          className={`control control-select ${className || ''}`}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        >
          {options
            ? options.map(o => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDownIcon size={15} className="control-affix" />
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, wrapperClassName, rows = 4, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp || `ta-${autoId}`;

  return (
    <FieldShell
      id={id} label={label} error={error} hint={hint}
      required={required} className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`control control-textarea ${className || ''}`}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
});

/** Two-up row that collapses to a single column on narrow screens. */
export function FieldRow({ children, className = '' }) {
  return <div className={`field-row ${className}`}>{children}</div>;
}

export default Input;
