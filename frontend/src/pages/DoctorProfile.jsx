import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDoctorProfile, updateDoctorProfile } from "../api/doctor";
import { Link } from "react-router-dom";
import "./profile-page.css";

const SPECIALTIES = [
  "Cardiology","Dermatology","Endocrinology","Gastroenterology","General Practice",
  "Neurology","Obstetrics & Gynaecology","Oncology","Orthopaedics",
  "Paediatrics","Psychiatry","Radiology","Urology"
];

export default function DoctorProfile() {
  const { token, user } = useAuth() || {};

  const [form, setForm] = useState({ specialization: "", contact: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // phone validation state
  const [contactErr, setContactErr] = useState("");
  const [contactTouched, setContactTouched] = useState(false);
  const contactRef = useRef(null);

  const clean = (f) => ({
    specialization: (f.specialization || "").trim(),
    contact: (f.contact || "").trim(),
  });
  const baselineRef = useRef(clean(form));

  const initials = useMemo(() => {
    const parts = (user?.name || "Doctor").trim().split(/\s+/);
    return (parts[0]?.[0] || "D") + (parts[1]?.[0] || "");
  }, [user]);

  const isDirty = JSON.stringify(clean(form)) !== JSON.stringify(baselineRef.current);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr(""); setOk("");
        const p = await getDoctorProfile(token);
        if (ignore) return;
        const next = {
          specialization: p?.specialization ?? "",
          contact: p?.contact ?? "",
        };
        setForm(next);
        baselineRef.current = clean(next);
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load profile");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [token]);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(""), 3500);
    return () => clearTimeout(t);
  }, [ok]);

  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(""), 3500);
    return () => clearTimeout(t);
  }, [err]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setOk("");
  }

  const handleContactChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, contact: digits }));
    if (contactTouched) {
      setContactErr(digits.length === 10 ? "" : "Enter exactly 10 digits.");
    }
    setOk("");
  };

  const handleContactBlur = () => {
    setContactTouched(true);
    setContactErr((form.contact || "").length === 10 ? "" : "Enter exactly 10 digits.");
  };

  function startEdit() {
    setEditing(true);
    setOk(""); setErr("");
    setContactErr("");
    setContactTouched(false);
  }

  function cancelEdit() {
    setForm(baselineRef.current);
    setEditing(false);
    setOk(""); setErr("");
    setContactErr("");
    setContactTouched(false);
  }

  async function save() {
    const digits = (form.contact || "").replace(/\D/g, "");
    if (digits.length !== 10) {
      setContactTouched(true);
      setContactErr("Enter exactly 10 digits.");
      setErr("Failed to update profile");
      return;
    }

    if (!isDirty) { setEditing(false); return; }
    setSaving(true); setErr(""); setOk("");
    try {
      const payload = clean({ ...form, contact: digits });
      await updateDoctorProfile(token, payload);
      baselineRef.current = payload;
      setOk("Profile updated successfully.");
      setEditing(false);
      setContactErr("");
      setContactTouched(false);
    } catch (e) {
      setErr(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-shell">
      <header className="profile-header" role="banner">
        <div className="container profile-container header-layout">
          <div className="header-left">
            <h2 className="page-title">My Profile</h2>
            <p className="subtle mb-0">Update your specialization and contact so patients can reach you.</p>
          </div>

          <div className="header-actions">
            <Link to="/doctor/dashboard" className="btn back-button">
              <i className="bi bi-arrow-left-short me-1" /> Back to Dashboard
            </Link>

            {!editing ? (
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={startEdit}
              >
                <i className="bi bi-pencil-square me-1" /> Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={save}
                  disabled={saving || !isDirty}
                  aria-disabled={saving || !isDirty}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1" />
                      Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <i className="bi bi-x-circle me-1" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container profile-container profile-content mt-5">
        <div className="visually-hidden" aria-live="polite">
          {ok || err}
        </div>

        {err && <div className="alert alert-danger mb-4" role="alert">{err}</div>}
        {ok && <div className="alert alert-success mb-4" role="status">{ok}</div>}

        <div className="row g-4">
          {/* Summary */}
          <aside className="col-12 col-lg-4">
            <div className="card card-gradient">
              {loading ? (
                <div>
                  <div className="skel skel-profile mb-3" />
                  <div className="skel skel-line mb-2" />
                  <div className="skel skel-line w-75 mb-3" />
                  <div className="skel skel-line w-100 mb-2" />
                  <div className="skel skel-line w-100 mb-2" />
                  <div className="skel skel-line w-50" />
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-center mb-3">
                    <div className="profile-ring me-3">
                      <div className="profile" aria-hidden="true">{initials.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="h5 mb-1">{user?.name.toUpperCase() || "Doctor"}</div>
                    </div>
                  </div>

                  <ul className="list-unstyled info-list mb-0">
                    <li><span>Email:</span><strong>{user?.email || "—"}</strong></li>
                    <li><span>Specialization:</span><strong>{form.specialization || "—"}</strong></li>
                    <li><span>Contact:</span><strong>{form.contact || "—"}</strong></li>
                  </ul>
                </>
              )}
            </div>
          </aside>

          {/* Form */}
          <section className="col-12 col-lg-8">
            <div className="card card-glass card-gradient">
              <div className="d-flex align-items-center gap-2 mb-2">
                <h4 className="mb-0 fw-semibold mb-3 right-heading">Professional Details</h4>
              </div>

              {loading ? (
                <div>
                  <div className="skel skel-line mb-3" />
                  <div className="skel skel-line mb-3" />
                  <div className="skel skel-line mb-3" />
                  <div className="skel skel-line w-75" />
                </div>
              ) : (
                <form onSubmit={(e) => e.preventDefault()} noValidate>
                  <div className="row g-3">
                    <div className="col-12 mb-3">
                      <label className="form-label field-label" htmlFor="pf-name">Name</label>
                      <input
                        id="pf-name"
                        type="text"
                        className="form-control field-input"
                        value={user?.name || ""}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-12 mb-3">
                      <label className="form-label field-label" htmlFor="pf-spec">Specialization</label>
                      <input
                        id="pf-spec"
                        list="specialty-list"
                        name="specialization"
                        className="form-control field-input"
                        placeholder="e.g., Cardiology"
                        value={form.specialization}
                        onChange={onChange}
                        disabled={!editing}
                        autoComplete="off"
                      />
                      <datalist id="specialty-list">
                        {SPECIALTIES.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </div>

                    <div className="col-12 mb-5">
                      <label className="form-label field-label" htmlFor="pf-contact">Contact Number</label>
                      <div className="input-group">
                        <span className="input-group-text field-icon" aria-hidden="true">
                          <i className="bi bi-telephone"></i>
                        </span>
                        <input
                          id="pf-contact"
                          type="tel"
                          name="contact"
                          className="form-control field-input"
                          placeholder="(07) 1234 5678"
                          value={form.contact}
                          onChange={handleContactChange}
                          onBlur={handleContactBlur}
                          disabled={!editing}
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          aria-invalid={contactErr ? "true" : "false"}
                          aria-describedby="contact-help contact-error"
                          ref={contactRef}
                        />
                      </div>

                      {/* helper message while editing & partially filled */}
                      {editing && !contactErr && form.contact.length > 0 && form.contact.length < 10 && (
                        <div id="contact-help" className="form-text d-block mt-1">Enter exactly 10 digits.</div>
                      )}
                      {/* validation error */}
                      {contactErr && <div id="contact-error" className="field-error mt-1">{contactErr}</div>}
                    </div>
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
