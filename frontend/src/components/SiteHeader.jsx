import { Link } from "react-router-dom";
import "./site-header.css";

export default function SiteHeader() {
  return (
    <header className="mf-header">
      <div className="mf-header__inner mf-header__inner--gutter">
        <Link to="/" className="mf-brand" aria-label="MediFinder home">
          <span className="mf-brand__badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" role="img" focusable="false">
              <circle cx="12" cy="12" r="11" fill="none" stroke="#FFFFFF" strokeWidth="2"/>
              <circle cx="12" cy="12" r="9" fill="#173e59"/>
              <path d="M12 8v8M8 12h8" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="mf-brand__text">
            <span className="mf-brand__medi">Medi</span>Finder
          </span>
        </Link>

        <nav className="mf-nav">
          <Link to="/login" className="mf-btn mf-btn--ghost">Login</Link>
          <Link to="/signup" className="mf-btn mf-btn--primary">Sign Up</Link>
        </nav>
      </div>
    </header>
  );
}
