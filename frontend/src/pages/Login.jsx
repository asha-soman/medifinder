import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./auth-hero.css";

export default function Login() {
  const [email, setEmail] = useState("");
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
      nav(u.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard", { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  return (
    <>
      <section className="mf-hero">

        <div className="mf-hero__center">
          <form className="mf-card" onSubmit={onSubmit}>
            <h1 className="mf-card__title">
              <span className="mf-accent">Log</span>in
            </h1>

            {err && <div className="mf-error" role="alert">{err}</div>}

            <label className="mf-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="mf-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <label className="mf-label" htmlFor="login-password">Password</label>
            <div className="input-group input-group-lg">
              <input
                id="login-password"
                className="form-control"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
            <button className="mf-cta" type="submit">Login</button>
            <p className="mf-help">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
