import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./auth-hero.css";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [err, setErr] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await register(name, email, role, password);
      nav("/login", { replace: true, state: { email } });
    } catch (e) {
      setErr(e.message || "Signup failed");
    }
  }

  return (
    <section className="auth-hero" aria-label="Healthcare background">
      <div className="auth-hero-center">
        <form className="auth-card" onSubmit={onSubmit} noValidate>
          <h1 className="auth-card-title">
            <span className="auth-accent">Sign</span> Up
          </h1>

          {err && (
            <div className="auth-error" role="alert">
              {err}
            </div>
          )}

          <label className="auth-label" htmlFor="su-name">Full name</label>
          <input
            id="su-name"
            className="auth-input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <label className="auth-label" htmlFor="su-email">Email</label>
          <input
            id="su-email"
            className="auth-input"
            type="email"
            placeholder="Email Id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="su-pass">Password</label>
          <div className="input-group input-group-lg">
            <input
              id="su-pass"
              className="form-control"
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn btn-light btn-eye"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              aria-pressed={showPwd}
            >
              <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
            </button>
          </div>

          <label className="auth-label" htmlFor="su-role">Role</label>
          <select
            id="su-role"
            className="auth-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>

          <button className="auth-cta" type="submit">Create an Account</button>

          <p className="auth-help">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
