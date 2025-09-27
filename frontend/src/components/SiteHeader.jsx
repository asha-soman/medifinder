import { Link } from "react-router-dom";
import "./site-header.css";

export default function SiteHeader(){
  return (
    <header className="mf-header">
      <div className="mf-header__inner">
        <Link to="/" className="mf-brand">
          <span className="mf-brand__icon">＋</span>
          <span className="mf-brand__text"><b>Medi</b>Finder</span>
        </Link>

        <nav className="mf-nav">
          <Link to="/login" className="mf-btn mf-btn--ghost">Login</Link>
          <Link to="/signup" className="mf-btn mf-btn--primary">Sign Up</Link>
        </nav>
      </div>
    </header>
  );
}
