import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./auth-hero.css";

export default function Login() {
  const loc = useLocation();
  const [email, setEmail] = useState(loc.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(email, password);
      nav(u.role === "doctor" ? "/doctor/dashboard" : "/patient/search", {
        replace: true,
      });
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  return (
    <section className="auth-hero">
      <div className="auth-hero-center">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1 className="auth-card-title">
            <span className="auth-accent">Log</span>in
          </h1>

          {err && (
            <div className="auth-error" role="alert">
              {err}
            </div>
          )}

          <label className="auth-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="auth-input"
            type="email"
            placeholder="Email Id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="login-password">Password</label>
          <div className="input-group input-group-lg">
            <input
              id="login-password"
              className="form-control"
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="btn btn-light btn-eye"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
            </button>
          </div>

          <button className="auth-cta" type="submit">Login</button>

          <p className="auth-help">
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
