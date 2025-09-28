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
    e.preventDefault(); setErr("");
    try {
      const u = await register(name, email, role, password);
      nav(u.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard", { replace: true });
    } catch (e) { setErr(e.message || "Signup failed"); }
  }

  return (
    <>
      <section className="mf-hero" role="img" aria-label="Healthcare background">
        <div className="mf-hero__center">
          <form className="mf-card" onSubmit={onSubmit}>
            <h1 className="mf-card__title">
              <span className="mf-accent">Sign</span> Up
            </h1>

            {err && <div className="mf-error" role="alert">{err}</div>}

            <label className="mf-label" htmlFor="su-name">Full name</label>
            <input
              id="su-name"
              className="mf-input"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />

            <label className="mf-label" htmlFor="su-email">Email</label>
            <input
              id="su-email"
              className="mf-input"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <label className="mf-label" htmlFor="su-pass">Password</label>
            <div className="input-group input-group-lg">
              <input
                id="su-pass"
                className="form-control"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>


            <label className="mf-label" htmlFor="su-role">Role</label>
            <select
              id="su-role"
              className="mf-input"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>

            <button className="mf-cta" type="submit">Create an Account</button>

            <p className="mf-help">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
        </div>
      </section>
    </>
  );

}
