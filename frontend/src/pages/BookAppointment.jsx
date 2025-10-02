// src/pages/BookAppointment.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bookAppointment, getMe } from "../api/bookingApi";
import "./BookAppointment.css";

export default function BookAppointment() {
  const { state } = useLocation(); // expects { doctor, slotISO }
  const navigate = useNavigate();

  const doctor = state?.doctor || {};
  const slotISO = state?.slotISO || null;

  // user & UI
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // --- helpers: decode JWT for fallback user id ---
  const decodeJwt = (t) => {
    try {
      const part = t.split(".")[1];
      const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(b64 + pad));
    } catch {
      return null;
    }
  };
  const claimId = (claims) =>
    claims?.sub ||
    claims?.userId ||
    claims?.uid ||
    claims?.id ||
    claims?._id ||
    claims?.user?._id ||
    claims?.user?.id ||
    null;

  // ---- hydrate user (try /me, else decode JWT) ----
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("jwt");
      if (!token) {
        setMe(null);
        setMeLoading(false);
        return;
      }
      try {
        // Preferred: authoritative profile
        const u = await getMe();
        if (u?._id) {
          setMe(u);
          if (u?.name) setPatientName((v) => v || u.name);
          if (u?.email) setEmail((v) => v || u.email);
          if (u?.phone) setContactNumber((v) => v || u.phone);
          return;
        }
      } catch {
        // fall through to JWT decode
      } finally {
        setMeLoading(false);
      }

      // Fallback: decode token for id/role if /me failed
      const claims = decodeJwt(token);
      const pid = claimId(claims);
      if (pid) {
        setMe((m) => m || { _id: pid, role: claims?.role || claims?.roles?.[0] });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // guard: must come from Search page with a doctor + slot
  const doctorId = doctor.doctorId ?? doctor.doctorUserId ?? doctor._id ?? null;
  if (!doctorId || !slotISO) {
    return (
      <div className="book-page">
        <h1 className="page-title">Book Appointment</h1>
        <div className="error-block">Missing booking details. Please go back and choose a doctor & time.</div>
        <div className="actions">
          <button className="btn appointment-button btn-cancel" onClick={() => navigate("/search")}>
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const local = new Date(slotISO);
  const prettyDate = local.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const prettyTime = local.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const onSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        // no token at all -> must login
        navigate("/login", { state: { from: { pathname: "/patient/book" }, msg: "Please sign in to book" } });
        return;
      }

      // Pull patient id from /me or JWT claims
      let patientId = me?._id;
      if (!patientId) {
        const claims = decodeJwt(token);
        patientId = claimId(claims);
      }

      // Build payload: backend expects `start` (ISO) and typically infers patient from JWT
      // but we also pass patient ids if meron
      const payload = {
        doctorUserId: doctorId,
        doctorId: doctorId,
        start: slotISO,
        reason: reason?.trim() || undefined,
        ...(patientId ? { patientUserId: patientId, patientId } : {}),
      };

      await bookAppointment(payload);

      navigate("/patient/my-appointments", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="book-page">
      <h1 className="page-title">Book Appointment</h1>

      {/* Appointment Summary */}
      <div className="section">
        <div className="section-title">Appointment Summary</div>

        <div className="summary-card">
          <div className="summary-row">
            <span className="label-strong">Doctor:</span>
            <span className="text">
              &nbsp;{doctor.doctorName || doctor.name}&nbsp;–&nbsp;{doctor.specialty || doctor.specialization}
            </span>
          </div>

          <div className="summary-row summary-row--meta">
            <div className="meta-cell meta-left">
              <span className="label-strong">Date:</span>
              <span className="text">&nbsp;{prettyDate}</span>
            </div>
            <div className="meta-cell meta-center">
              <span className="label-strong">Time:</span>
              <span className="text">&nbsp;{prettyTime}</span>
            </div>
            <div className="meta-cell meta-right">
              <span className="label-strong">Duration:</span>
              <span className="text">&nbsp;60 mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Details (display-only) */}
      <div className="section">
        <div className="section-title">Patient Details</div>

        <div className="form-grid">
          <div className="form-field form-span-2">
            <label className="label">Name</label>
            <input className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" />
          </div>

          <div className="form-field">
            <label className="label">Email Address</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
          </div>

          <div className="form-field">
            <label className="label">Contact Number</label>
            <input className="input" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="+61 ..." />
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="section">
        <div className="section-title">Reason For Visit</div>
        <textarea className="textarea" rows={5} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
      </div>

      {error && <div className="error-block">{error}</div>}

      {/* Actions */}
      <div className="actions">
        <button className="btn appointment-button btn-cancel" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button className="btn appointment-button btn-primary" onClick={onSubmit} disabled={submitting || meLoading}>
          {submitting ? "Booking…" : "Book"}
        </button>
      </div>
    </div>
  );
}
