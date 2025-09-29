import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDoctorProfile, updateDoctorProfile } from "../api/doctor";
import "./doctor-profile.css";

const SPECIALTIES = [
  "Cardiology","Dermatology","Endocrinology","Gastroenterology","General Practice",
  "Neurology","Obstetrics & Gynaecology","Oncology","Orthopaedics",
  "Paediatrics","Psychiatry","Radiology","Urology"
];

export default function DoctorProfile() {
  const { token, user } = useAuth() || {};
  const nav = useNavigate();

  const [form, setForm] = useState({ specialization: "", clinicName: "", contact: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const initials = useMemo(
    () => (user?.name || "D").trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase(),
    [user]
  );

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const p = await getDoctorProfile(token);
        if (!ignore) {
          setForm({
            specialization: p?.specialization ?? "",
            clinicName: p?.clinicName ?? "",
            contact: p?.contact ?? "",
          });
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load profile");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [token]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true); setErr(""); setOk("");
    try {
      await updateDoctorProfile(token, {
        specialization: form.specialization.trim(),
        clinicName: form.clinicName.trim(),
        contact: form.contact.trim(),
      });
      setOk("Profile updated successfully.");
    } catch (e) {
      setErr(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dp-shell">
      {/* Header */}
      <header className="dp-header">
        <div className="container dp-container">
          <div>
            <nav className="small dp-crumb">
              <Link to="/doctor/dashboard" className="dp-crumb__link">Dashboard</Link>
              <span className="mx-2">/</span>
              <span className="dp-crumb__current">Profile</span>
            </nav>
            <h1 className="dp-title">Doctor Profile</h1>
            <div className="dp-title-underline" />
            <p className="dp-subtle mb-0">Keep your professional details up to date.</p>
          </div>

          <Link to="/doctor/dashboard" className="btn dp-btn-ghost">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container dp-container dp-content">
        {err && <div className="alert alert-danger mb-4">{err}</div>}
        {ok && <div className="alert alert-success mb-4">{ok}</div>}

        <div className="row g-4">
          {/* Summary */}
          <aside className="col-12 col-lg-4">
            <div className="dp-card dp-card--glass">
              <div className="d-flex align-items-center mb-3">
                <div className="dp-avatar-ring me-3">
                  <div className="dp-avatar">{initials}</div>
                </div>
                <div>
                  <div className="h5 mb-1">{user?.name || "Doctor"}</div>
                  <span className="dp-chip">Verified</span>
                </div>
              </div>

              <ul className="list-unstyled dp-list mb-0">
                <li><span>Email</span><strong>{user?.email || "—"}</strong></li>
                <li><span>Specialization</span><strong>{form.specialization || "—"}</strong></li>
                <li><span>Clinic</span><strong>{form.clinicName || "—"}</strong></li>
                <li><span>Contact</span><strong>{form.contact || "—"}</strong></li>
              </ul>
            </div>
          </aside>

          {/* Form */}
          <section className="col-12 col-lg-8">
            <div className="dp-card dp-card--glass">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="dp-secicon">🔒</span>
                <h2 className="h5 mb-0 fw-semibold">Professional Details</h2>
              </div>
              <p className="dp-subtle mb-4">These details are shown to patients when they discover you.</p>

              {loading ? (
                <div className="dp-subtle">Loading profile…</div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label dp-label">Name</label>
                      <input type="text" className="form-control dp-input" value={user?.name || ""} disabled readOnly />
                    </div>

                    <div className="col-12">
                      <label className="form-label dp-label">Specialization</label>
                      <input
                        list="specialty-list"
                        name="specialization"
                        className="form-control dp-input"
                        placeholder="e.g., Cardiology"
                        value={form.specialization}
                        onChange={onChange}
                      />
                      <datalist id="specialty-list">
                        {SPECIALTIES.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>

                    <div className="col-12">
                      <label className="form-label dp-label">Clinic / Practice Name</label>
                      <input
                        type="text"
                        name="clinicName"
                        className="form-control dp-input"
                        placeholder="e.g., City Health Clinic"
                        value={form.clinicName}
                        onChange={onChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label dp-label">Primary Contact</label>
                      <div className="input-group">
                        <span className="input-group-text dp-input-icon">☎</span>
                        <input
                          type="text"
                          name="contact"
                          className="form-control dp-input"
                          placeholder="(07) 1234 5678"
                          value={form.contact}
                          onChange={onChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button className="btn dp-btn-primary px-4" type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button type="button" className="btn dp-btn-ghost" onClick={() => nav("/doctor/dashboard")}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
