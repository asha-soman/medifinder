import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./patient-dashboard.css"; // re-use the same CSS as doctor dashboard

export default function PatientDashboard() {
  const { user, token } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);     
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load patient dashboard");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <div className="dash-shell">
      <section className="dash-hero">
        <div className="container">
          <div className="dash-hero__panel">
            <h1 className="dash-hero__title">
              Welcome, {user?.name ? user.name : "Patient"}
            </h1>
          </div>
          <div className="row g-4 mt-0">
            <div className="col-12 col-lg-4">
              <div className="dash-card h-100">
                <h5 className="mb-2">My Profile</h5>
                <p className="text-muted mb-3">
                  View & update your personal information.
                </p>
                <Link to="/patient/profile" className="btn btn-primary btn-sm">
                  Go to Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mt-3">
        {err && <div className="alert alert-danger">{err}</div>}
        {loading && <div className="text-muted">Loading…</div>}
      </div>
    </div>
  );
}
