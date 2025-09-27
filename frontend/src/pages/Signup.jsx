import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./auth-hero.css";

export default function Signup(){
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [role,setRole] = useState("patient");
  const [err,setErr] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();

  async function onSubmit(e){
    e.preventDefault(); setErr("");
    try{
      const u = await register(name, email, role, password);
      nav(u.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard", { replace:true });
    }catch(e){ setErr(e.message || "Signup failed"); }
  }

  return (
    <>
      <section className="mf-hero" role="img" aria-label="Healthcare background">
        <div className="mf-hero__overlay">
          <form className="mf-card" onSubmit={onSubmit}>
            <h1 className="mf-card__title">Sign Up</h1>

            {err && <div className="mf-error">{err}</div>}

            <input
              className="mf-input" placeholder="Full name" value={name}
              onChange={e=>setName(e.target.value)} required
            />
            <input
              className="mf-input" placeholder="Email" type="email" value={email}
              onChange={e=>setEmail(e.target.value)} required
            />
            <input
              className="mf-input" placeholder="Password" type="password" value={password}
              onChange={e=>setPassword(e.target.value)} required
            />
            <select className="mf-input" value={role} onChange={e=>setRole(e.target.value)}>
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
