import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./site-header.css";

export default function SiteHeader() {
  const { logout, isAuthed } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout?.();
    nav("/login", { replace: true });
  };

  const authed = isAuthed ?? !!localStorage.getItem("token"); // fallback if isAuthed not provided

  return (
    <header className="mf-header">
      <div className="mf-header__inner mf-header__inner--gutter">
        <Link to="/" className="mf-brand" aria-label="MediFinder home">
          <span className="mf-brand__badge" aria-hidden="true">
            {/* your existing icon SVG/i here */}
          </span>
          <span className="mf-brand__text"><span className="mf-brand__medi">Medi</span>Finder</span>
        </Link>

        <nav className="mf-nav">
          {authed ? (
            <>
             <button
  type="button"
  onClick={handleLogout}
  className="btn btn-sm btn-success"  // green Bootstrap button
>
  Logout
</button>


            </>
          ) : (
            <>
              <Link to="/login" className="mf-btn mf-btn--ghost">Login</Link>
              <Link to="/signup" className="mf-btn mf-btn--primary">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
