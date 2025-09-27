import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./auth-hero.css"; 

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <section
        className="mf-hero"
      >
        <div className="mf-hero__overlay">
          <form className="mf-card" onSubmit={onSubmit}>
            <h1 className="mf-card__title">Login</h1>

            {err && <div className="mf-error">{err}</div>}

            <input
              className="mf-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="mf-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

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
