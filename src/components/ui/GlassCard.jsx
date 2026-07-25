import './GlassCard.css';

export default function GlassCard({ children, className = '', hover = true, onClick, style }) {
  return (
    <div
      className={`glass-card-component ${hover ? 'glass-hover' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
