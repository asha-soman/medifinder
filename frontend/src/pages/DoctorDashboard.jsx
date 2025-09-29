import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./doctor-dashboard.css";
import { useAuth } from "../context/AuthContext";      // if your AuthContext exports this
import { apiFetch } from "../api/client";               // you already have this

export default function DoctorDashboard() {
  const { user, token } = useAuth() || {};
  const [stats, setStats] = useState({ upcoming: 0, today: 0, patients: 0 });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch("/doctor/dashboard", { token });
        // shape this to whatever your facade returns
        const mapped = {
          upcoming: data?.upcomingCount ?? 0,
          today:    data?.todayCount ?? 0,
          patients: data?.patientCount ?? 0,
        };
        if (!ignore) setStats(mapped);
      } catch {
        // swallow for now; show zeros
      }
    }
    if (token) load();
    return () => { ignore = true; };
  }, [token]);

  return (
    <div className="doctor-dashboard">
      {/* HERO */}
      <section className="docdash-hero d-flex align-items-center">
        <div className="container position-relative">
          <div className="docdash-hero-overlay rounded-3 p-4 p-md-5">
            <h1 className="display-5 fw-bold text-white mb-2">
              {user?.name ? `Welcome, Dr. ${user.name.split(" ")[0]}` : "Doctor Dashboard"}
            </h1>
            <p className="lead text-white-50 mb-0">
              Manage your profile, availability, and patient appointments.
            </p>
          </div>

          {/* Quick links card (centered overlay) */}
          <div className="docdash-actions card shadow-lg border-0">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <Link to="/doctor/profile" className="docdash-link card h-100">
                    <div className="card-body d-flex flex-column">
                      <h5 className="fw-semibold mb-2">My Profile</h5>
                      <p className="text-muted mb-3 flex-grow-1">
                        View & update your professional information.
                      </p>
                      <span className="btn btn-primary mt-auto align-self-start">Go to Profile</span>
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-md-4">
                  <Link to="/doctor/availability" className="docdash-link card h-100">
                    <div className="card-body d-flex flex-column">
                      <h5 className="fw-semibold mb-2">Manage Availability</h5>
                      <p className="text-muted mb-3 flex-grow-1">
                        Add or edit your available time slots.
                      </p>
                      <span className="btn btn-primary mt-auto align-self-start">Manage Slots</span>
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-md-4">
                  <Link to="/doctor/appointments" className="docdash-link card h-100">
                    <div className="card-body d-flex flex-column">
                      <h5 className="fw-semibold mb-2">Appointments</h5>
                      <p className="text-muted mb-3 flex-grow-1">
                        View and manage patient appointments.
                      </p>
                      <span className="btn btn-primary mt-auto align-self-start">Open List</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* STATS STRIP */}
      <section className="py-4 bg-light">
        <div className="container">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="stat-card card text-center shadow-sm">
                <div className="card-body">
                  <div className="stat-number">{stats.today}</div>
                  <div className="stat-label text-muted">Today’s Appointments</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="stat-card card text-center shadow-sm">
                <div className="card-body">
                  <div className="stat-number">{stats.upcoming}</div>
                  <div className="stat-label text-muted">Upcoming</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="stat-card card text-center shadow-sm">
                <div className="card-body">
                  <div className="stat-number">{stats.patients}</div>
                  <div className="stat-label text-muted">Patients</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer comes from AppLayout — no duplicate here */}
    </div>
  );
}
