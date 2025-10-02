import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function Landing() {
  const specialties = [
    "General Practice",
    "Cardiology",
    "Dermatology",
    "Paediatrics",
    "Orthopaedics",
    "Psychiatry",
    "Neurology",
    "Gastroenterology",
    "Ophthalmology",
    "Urology"
  ];

  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-content container-fluid">
          <h1 className="hero-title">Connecting You to Trusted Doctors.</h1>
          <p className="hero-subtitle">Find the care you need, when you need it.</p>

          <div className="hero-actions">
            <Link to="/signup" className="btn btn-success btn-lg hero-btn">
              Get Started
            </Link>
          </div>
        </div>

        <div className="hero-divider" aria-hidden="true" />
      </section>
      <section className="band-explore container-fluid mt-5">
        <div className="band-explore-inner">
          <div className="section-head">
            <span className="section-head-icon" aria-hidden="true">
              <i className="bi bi-heart-pulse"></i>
            </span>

            <div className="section-head-text">
              <h2 className="section-title">Explore Top Specialties</h2>
              <p className="section-subtitle">Book with verified specialists near you.</p>
            </div>
          </div>

          <div className="specialty-grid">
            {specialties.map((s) => (
              <Link key={s} to="/signup" className="specialty-card" aria-label={`Explore ${s}`}>
                <i className="bi bi-heart-pulse" aria-hidden="true"></i>
                <span>{s}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-how container-fluid mt-5 mb-5">
        <h2 className="section-title mb-5">How It Works</h2>

        <div className="how-grid">
          <div className="how-card">
            <i className="bi bi-search" aria-hidden="true"></i>
            <h3>Find</h3>
            <p>Browse doctors by specialty and availability.</p>
          </div>
          <div className="how-card">
            <i className="bi bi-calendar-check" aria-hidden="true"></i>
            <h3>Book</h3>
            <p>Choose a slot that suits your schedule.</p>
          </div>
          <div className="how-card">
            <i className="bi bi-chat-dots" aria-hidden="true"></i>
            <h3>Attend</h3>
            <p>Get reminders and manage your visits online.</p>
          </div>
        </div>
      </section>

      <section className="landing-trust mt-5 mb-5">
        <div className="container-fluid trust-grid mt-5 mb-5">
          <div className="trust-item">
            <div className="trust-value">120+</div>
            <div className="trust-label">Doctors</div>
          </div>
          <div className="trust-item">
            <div className="trust-value">5k+</div>
            <div className="trust-label">Patients</div>
          </div>
          <div className="trust-item">
            <div className="trust-value">12k+</div>
            <div className="trust-label">Appointments</div>
          </div>
        </div>
      </section>
    </main>
  );
}
