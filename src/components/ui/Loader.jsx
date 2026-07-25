import './Loader.css';

export default function Loader({ size = 'md', text = '' }) {
  return (
    <div className={`loader-container loader-${size}`}>
      <div className="loader-spinner">
        <div className="loader-bar" />
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
}
