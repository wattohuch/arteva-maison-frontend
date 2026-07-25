import './Button.css';

export default function Button({
  children, variant = 'primary', size = 'md',
  disabled = false, loading = false, onClick, type = 'button',
  className = '', fullWidth = false, ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="btn-spinner" /> : children}
    </button>
  );
}
