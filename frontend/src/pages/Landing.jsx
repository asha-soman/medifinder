// src/pages/LandingPage.jsx
import React from "react";
import "./LandingPage.css";   // custom CSS

function LandingPage() {
  return (
    <div className="landing-hero">
      <div className="overlay">
        <h1 className="hero-title">Connecting You to Trusted Doctors.</h1>
        <p className="hero-subtitle">
          Find the care you need, when you need it.
        </p>
        <button className="hero-button">Get Started</button>
      </div>
    </div>
  );
}

export default LandingPage;
