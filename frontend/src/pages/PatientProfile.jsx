import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPatientProfile, updatePatientProfile } from "../api/patient";
import "./patient-profile.css";

// utility to safely map Date to <input type="date"> value (YYYY-MM-DD)
function toDateInputValue(d) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PatientProfile() {
  const { token, user } = useAuth() || {};
  const nav = useNavigate();

  const [form, setForm] = useState({
    dateOfBirth: "",    // YYYY-MM-DD
    phone: "",
    address: "",
    emergencyContact: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const initials = useMemo(
    () =>
      (user?.name || "P")
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [user]
  );

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const p = await getPatientProfile(token);
        if (!ignore) {
          setForm({
            dateOfBirth: toDateInputValue(p?.dateOfBirth ?? ""),
            phone: p?.phone ?? "",
            address: p?.address ?? "",
            emergencyContact: p?.emergencyContact ?? "",
          });
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load profile");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [token]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setOk("");

    try {
      // Send as plain fields (backend will parse date string "YYYY-MM-DD")
      await updatePatientProfile(token, {
        dateOfBirth: form.dateOfBirth || null,
        phone: form.phone.trim(),
        address: form.address.trim(),
        emergencyContact: form.emergencyContact.trim(),
      });
      setOk("Profile updated successfully.");
    } catch (e) {
      setErr(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pp-shell">
      {/* Header */}
      <header className="pp-header">
        <div className="container pp-container">
          <div>
            <nav className="small pp-crumb">
              <Link to="/patient/dashboard" className="pp-crumb__link">
                Dashboard
              </Link>
              <span className="mx-2">/</span>
              <span className="pp-crumb__current">Profile</span>
            </nav>
            <h1 className="pp-title">Patient Profile</h1>
            <div className="pp-title-underline" />
            <p className="pp-subtle mb-0">
              Keep your personal information up to date.
            </p>
          </div>

          <Link to="/patient/dashboard" className="btn pp-btn-ghost">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container pp-container pp-content">
        {err && <div className="alert alert-danger mb-4">{err}</div>}
        {ok && <div className="alert alert-success mb-4">{ok}</div>}

        <div className="row g-4">
          {/* Summary */}
          <aside className="col-12 col-lg-4">
            <div className="pp-card pp-card--glass">
              <div className="d-flex align-items-center mb-3">
                <div className="pp-avatar-ring me-3">
                  <div className="pp-avatar">{initials}</div>
                </div>
                <div>
                  <div className="h5 mb-1">{user?.name || "Patient"}</div>
                  <span className="pp-chip">Verified</span>
                </div>
              </div>

              <ul className="list-unstyled pp-list mb-0">
                <li>
                  <span>Email</span>
                  <strong>{user?.email || "—"}</strong>
                </li>
                <li>
                  <span>Phone</span>
                  <strong>{form.phone || "—"}</strong>
                </li>
                <li>
                  <span>Date of Birth</span>
                  <strong>{form.dateOfBirth || "—"}</strong>
                </li>
              </ul>
            </div>
          </aside>

          {/* Form */}
          <section className="col-12 col-lg-8">
            <div className="pp-card pp-card--glass">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="pp-secicon">🧑‍⚕️</span>
                <h2 className="h5 mb-0 fw-semibold">Personal Details</h2>
              </div>
              <p className="pp-subtle mb-4">
                These details are used for appointments and reminders.
              </p>

              {loading ? (
                <div className="pp-subtle">Loading profile…</div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="row g-3">
                    {/* Name (read only) */}
                    <div className="col-12">
                      <label className="form-label pp-label">Name</label>
                      <input
                        type="text"
                        className="form-control pp-input"
                        value={user?.name || ""}
                        disabled
                        readOnly
                      />
                    </div>

                    {/* Date of Birth */}
                    <div className="col-md-6 col-12">
                      <label className="form-label pp-label">Date of Birth</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        className="form-control pp-input"
                        value={form.dateOfBirth}
                        onChange={onChange}
                      />
                    </div>

                    {/* Phone */}
                    <div className="col-md-6 col-12">
                      <label className="form-label pp-label">Phone</label>
                      <div className="input-group">
                        <span className="input-group-text pp-input-icon">☎</span>
                        <input
                          type="text"
                          name="phone"
                          className="form-control pp-input"
                          placeholder="(07) 1234 5678"
                          value={form.phone}
                          onChange={onChange}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="col-12">
                      <label className="form-label pp-label">Address</label>
                      <textarea
                        name="address"
                        rows="3"
                        className="form-control pp-input"
                        placeholder="Street, City, State, Postcode"
                        value={form.address}
                        onChange={onChange}
                      />
                    </div>

                    {/* Emergency Contact */}
                    <div className="col-12">
                      <label className="form-label pp-label">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        name="emergencyContact"
                        className="form-control pp-input"
                        placeholder="Name and phone"
                        value={form.emergencyContact}
                        onChange={onChange}
                      />
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button
                      className="btn pp-btn-primary px-4"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="btn pp-btn-ghost"
                      onClick={() => nav("/patient/dashboard")}
                    >
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
