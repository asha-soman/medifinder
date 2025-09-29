import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPatientDashboard } from "../api/patient";
import "./patient-dashboard.css"; // re-use the same CSS as doctor dashboard

export default function PatientDashboard() {
  const { user, token } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState({
    todayAppointments: 0,
    upcoming: 0,
    records: 0,
    notifications: 0,
  });

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getPatientDashboard(token);
        if (!ignore) {
          setData({
            todayAppointments: res?.todayAppointments ?? 0,
            upcoming: res?.upcoming ?? 0,
            records: res?.records ?? 0,
            notifications: res?.notifications ?? 0,
          });
        }
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
      {/* Hero */}
      <section className="dash-hero">
        <div className="container">
          <div className="dash-hero__panel">
            <h1 className="dash-hero__title">
              Welcome, {user?.name ? user.name : "Patient"}
            </h1>
            <p className="dash-hero__subtitle">
              Find the care you need, manage your appointments, and view your health records.
            </p>
          </div>

          {/* Feature cards */}
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

            <div className="col-12 col-lg-4">
              <div className="dash-card h-100">
                <h5 className="mb-2">Find a Doctor</h5>
                <p className="text-muted mb-3">
                  Search by name or specialty and book an appointment.
                </p>
                <div className="d-flex gap-2">
                  <Link to="/search" className="btn btn-outline-primary btn-sm">
                    Search Doctors
                  </Link>
                  <Link to="/appointments/book" className="btn btn-primary btn-sm">
                    Book Now
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="dash-card h-100">
                <h5 className="mb-2">Appointments</h5>
                <p className="text-muted mb-3">
                  View, reschedule, or cancel your appointments.
                </p>
                <Link to="/appointments" className="btn btn-primary btn-sm">
                  Open List
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error/Loading */}
      <div className="container mt-3">
        {err && <div className="alert alert-danger">{err}</div>}
        {loading && <div className="text-muted">Loading…</div>}
      </div>

      {/* Stats */}
      {!loading && (
        <section className="container mt-3 mb-5">
          <div className="row g-4">
            <div className="col-12 col-lg-3">
              <div className="stat-card">
                <div className="stat-card__value">{data.todayAppointments}</div>
                <div className="stat-card__label">Today’s Appointments</div>
              </div>
            </div>
            <div className="col-12 col-lg-3">
              <div className="stat-card">
                <div className="stat-card__value">{data.upcoming}</div>
                <div className="stat-card__label">Upcoming</div>
              </div>
            </div>
            <div className="col-12 col-lg-3">
              <div className="stat-card">
                <div className="stat-card__value">{data.records}</div>
                <div className="stat-card__label">Records</div>
              </div>
            </div>
            <div className="col-12 col-lg-3">
              <div className="stat-card">
                <div className="stat-card__value">{data.notifications}</div>
                <div className="stat-card__label">Notifications</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
