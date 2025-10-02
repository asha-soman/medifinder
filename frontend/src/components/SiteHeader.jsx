import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./site-header.css";

export default function SiteHeader() {
  const { logout, isAuthed, user } = useAuth() || {};
  const navigate = useNavigate();

  const authed = isAuthed ?? !!localStorage.getItem("token");

  // Robust role detection (prefer context, fall back to localStorage if you store it)
  let role = user?.role;
  if (!role) {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      role = storedUser?.role;
    } catch { }
  }
  const isPatient = authed && role === "patient";

  const handleLogout = () => {
    logout?.();
    navigate("/", { replace: true });
  };

  return (
    <header className="header">
      <div className="header-container container-fluid">
        <Link to="/" className="header-brand text-decoration-none">
          <span className="header-logo" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              role="img"
              aria-label="MediFinder logo"
            >
              <rect x="13" y="6" width="6" height="20" rx="1.5" fill="#173e59" />
              <rect x="6" y="13" width="20" height="6" rx="1.5" fill="#173e59" />
            </svg>
          </span>

          <span className="header-brand-text">
            <span className="header-brand-medi">Medi</span>Finder
          </span>
        </Link>

        <nav className="header-nav">
          {isPatient && (
            <div className="header-links">
              <Link to="/patient/search" className="header-link">
                <i class="bi bi-search-heart me-1" aria-hidden="true"></i>
                Find a Doctor</Link>
              <Link to="/patient/my-appointments" className="header-link">
                <i className="bi bi-calendar-check me-1" aria-hidden="true"></i>
                My Appointments
              </Link>
              <Link to="/patient/history" className="header-link">
                <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
                History
              </Link>
              <Link to="/patient/notifications" className="header-link">
                <i class="bi bi-bell-fill me-1" aria-hidden="true"></i>
                Notification</Link>
              <Link to="/patient/profile" className="header-link">
                <i className="bi bi-person-circle me-1" aria-hidden="true"></i>
                Profile
              </Link>

            </div>
          )}

          {authed ? (
            <button
              onClick={handleLogout}
              className="btn btn-success btn-md fw-semibold"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-light btn-md fw-semibold">
                Login
              </Link>
              <Link to="/signup" className="btn btn-success btn-md fw-semibold ms-2">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
