import React from "react";
import { Link } from "react-router-dom";
import "./doctor-dashboard.css";
import { useAuth } from "../context/AuthContext";     
    

export default function DoctorDashboard() {
  const { user } = useAuth() || {};


  return (
    <div className="doctor-dashboard">
      <section className="docdash-hero d-flex align-items-center">
        <div className="container position-relative">
          <div className="docdash-hero-overlay rounded-3 p-4 p-md-5">
            <h1 className="display-5 fw-bold text-white mb-2">
              {user?.name ? `Welcome, Dr. ${user.name.split(" ")[0].toUpperCase()}` : "Doctor Dashboard"}
            </h1>
          </div>

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
              </div>
            </div>
          </div>

        </div>
      </section>



    </div>
  );
}
