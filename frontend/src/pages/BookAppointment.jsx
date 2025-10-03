// src/pages/BookAppointment.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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

  // validation state
  const [touched, setTouched] = useState({ email: false, phone: false });
  const [emailErr, setEmailErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");

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

  // ---- validators ----
  const validateEmail = (val) => {
    const v = (val || "").trim();
    if (!v) return "Email is required.";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return ok ? "" : "Enter a valid email (e.g., name@example.com).";
  };

  const validatePhoneAU = (val) => {
    const raw = (val || "").trim();
    if (!raw) return "Contact number is required.";
    const cleaned = raw.replace(/[^\d+]/g, "");
    const local = cleaned.startsWith("+61") ? "0" + cleaned.slice(3) : cleaned;
    const digits = local.replace(/\D/g, "");
    const mobileOk = /^04\d{8}$/.test(digits);
    const landlineOk = /^0[2378]\d{8}$/.test(digits);
    if (mobileOk || landlineOk) return "";
    return "Enter an AU number (e.g., 0412 345 678 or (07) 3123 4567).";
  };

  // ---- phone input filtering + formatting ----
  const filterPhoneChars = (input) => input.replace(/[^0-9+()\-\s]/g, "");
  const normalizeToLocal = (input) => {
    const digitsPlus = input.replace(/[^\d+]/g, "");
    if (digitsPlus.startsWith("+61")) {
      return "0" + digitsPlus.slice(3);
    }
    return digitsPlus;
  };

  const formatPhoneAU = useCallback((input) => {
    const filtered = filterPhoneChars(input);
    const localish = normalizeToLocal(filtered);
    const d = localish.replace(/\D/g, "");

    if (d.startsWith("04")) {
      if (d.length <= 4) return d;
      if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
      if (d.length <= 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
      return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)} ${d.slice(10)}`;
    }

    if (/^0[2378]/.test(d)) {
      if (d.length <= 2) return d;
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)} ${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)} ${d.slice(6, 10)} ${d.slice(10)}`;
    }

    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)} ${d.slice(10)}`;
  }, []);

  // Recompute errors on value change when field already touched
  useEffect(() => {
    if (touched.email) setEmailErr(validateEmail(email));
  }, [email, touched.email]);
  useEffect(() => {
    if (touched.phone) setPhoneErr(validatePhoneAU(contactNumber));
  }, [contactNumber, touched.phone]);

  const formValid = useMemo(() => {
    return !validateEmail(email) && !validatePhoneAU(contactNumber);
  }, [email, contactNumber]);

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
        const u = await getMe();
        if (u?._id) {
          setMe(u);
          if (u?.name) setPatientName((v) => v || u.name);
          if (u?.email) setEmail((v) => v || u.email);
          if (u?.phone) setContactNumber((v) => v || formatPhoneAU(u.phone));
          return;
        }
      } catch {
        // ignore
      } finally {
        setMeLoading(false);
      }

      const claims = decodeJwt(token);
      const pid = claimId(claims);
      if (pid) {
        setMe((m) => m || { _id: pid, role: claims?.role || claims?.roles?.[0] });
      }
    })();
  }, [formatPhoneAU]);

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
    const eErr = validateEmail(email);
    const pErr = validatePhoneAU(contactNumber);
    setEmailErr(eErr);
    setPhoneErr(pErr);
    setTouched({ email: true, phone: true });
    if (eErr || pErr) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        navigate("/login", { state: { from: { pathname: "/patient/book" }, msg: "Please sign in to book" } });
        return;
      }

      let patientId = me?._id;
      if (!patientId) {
        const claims = decodeJwt(token);
        patientId = claimId(claims);
      }

      const digitsLocal = normalizeToLocal(contactNumber).replace(/\D/g, "");
      const e164 = digitsLocal.startsWith("0")
        ? `+61${digitsLocal.slice(1)}`
        : digitsLocal.startsWith("61")
        ? `+${digitsLocal}`
        : `+61${digitsLocal}`;

      const payload = {
        doctorUserId: doctorId,
        doctorId: doctorId,
        start: slotISO,
        reason: reason?.trim() || undefined,
        ...(patientId ? { patientUserId: patientId, patientId } : {}),
        patientName: patientName?.trim() || undefined,
        email: email?.trim() || undefined,
        contactNumber: e164,
      };

      await bookAppointment(payload);
      navigate("/patient/my-appointments", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onBlurField = (key) => setTouched((t) => ({ ...t, [key]: true }));

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

      {/* Patient Details */}
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
              className={`input ${touched.email && emailErr ? "input-error" : ""}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => onBlurField("email")}
              aria-invalid={!!(touched.email && emailErr)}
              aria-describedby="email-help"
              placeholder="name@example.com"
            />
            {touched.email && emailErr ? (
              <div id="email-help" className="field-error">{emailErr}</div>
            ) : (
              <div id="email-help" className="field-hint">Enter valid email.</div>
            )}
          </div>

          <div className="form-field">
            <label className="label">Contact Number</label>
            <input
              className={`input ${touched.phone && phoneErr ? "input-error" : ""}`}
              type="tel"
              inputMode="tel"
              pattern="^[0-9+()\-\s]+$"
              value={contactNumber}
              onChange={(e) => {
                const next = formatPhoneAU(e.target.value);
                setContactNumber(next);
              }}
              onBlur={() => onBlurField("phone")}
              aria-invalid={!!(touched.phone && phoneErr)}
              aria-describedby="phone-help"
              placeholder="0412 345 678 or (07) 3123 4567"
            />
            {touched.phone && phoneErr ? (
              <div id="phone-help" className="field-error">{phoneErr}</div>
            ) : (
              <div id="phone-help" className="field-hint">AU numbers only. Letters are blocked.</div>
            )}
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
        <button className="btn appointment-button btn-cancel" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button
          className="btn appointment-button btn-primary"
          onClick={onSubmit}
          disabled={submitting || meLoading || !formValid}
          title={!formValid ? "Please fix the highlighted fields" : undefined}
        >
          {submitting ? "Booking…" : "Book"}
        </button>
      </div>
    </div>
  );
}
