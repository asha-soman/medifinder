// src/pages/BookAppointment.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bookAppointment } from "../api/bookingApi"; // ⬅️ removed getPatient
import "./BookAppointment.css";

export default function BookAppointment() {
  const { state } = useLocation(); // { doctor, slotISO }
  const navigate = useNavigate();

  const doctor = state?.doctor || {};
  const slotISO = state?.slotISO || null;

  // Local form state (no mock prefill)
  const [patientName, setPatientName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // (Optional) best-effort prefill from a global auth user if app provides one.
  // Safe no-op if nothing is available.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setPatientName(u.name);
        if (u?.email) setEmail(u.email);
        if (u?.phone) setContactNumber(u.phone);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!doctor?.doctorId || !slotISO) {
    return (
      <div className="book-page">
        <h1 className="page-title">Book Appointment</h1>
        <div className="error-block">
          Missing booking details. Please go back and choose a doctor & time.
        </div>
        <div className="actions">
          <button className="btn btn-cancel" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  const local = new Date(slotISO);
  const prettyDate = local.toLocaleDateString([], {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const prettyTime = local.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const onSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      // No patientId sent — backend uses req.user from the auth token
      await bookAppointment({
        doctorId: doctor.doctorId,
        start: slotISO,
        reason: reason?.trim() || undefined,
      });
      navigate("/patient/my-appointments", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="book-page">
      {/* Title */}
      <h1 className="page-title">Book Appointment</h1>

      {/* Appointment Summary */}
      <div className="section">
        <div className="section-title">Appointment Summary</div>

        <div className="summary-card">
          <div className="summary-row">
            <span className="label-strong">Doctor:</span>
            <span className="text">
              &nbsp;{doctor.doctorName}&nbsp;–&nbsp;{doctor.specialty}
            </span>
          </div>

          {/* Line 2: Date | Time | Duration */}
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

      {/* Patient Details (purely for display/edit in UI) */}
      <div className="section">
        <div className="section-title">Patient Details</div>

        <div className="form-grid">
          <div className="form-field form-span-2">
            <label className="label">Name</label>
            <input
              className="input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="form-field">
            <label className="label">Email Address</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
            />
          </div>

          <div className="form-field">
            <label className="label">Contact Number</label>
            <input
              className="input"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+61 ..."
            />
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="section">
        <div className="section-title">Reason For Visit</div>
        <textarea
          className="textarea"
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {error && <div className="error-block">{error}</div>}

      {/* Actions */}
      <div className="actions">
        <button className="btn btn-cancel" onClick={() => navigate(-1)}>Cancel</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Booking…" : "Book"}
        </button>
      </div>
    </div>
  );
}
