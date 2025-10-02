// src/pages/MyAppointments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  getMyAppointments,
  searchDoctors,
  editAppointment,
  cancelAppointmentApi,
  getMe,
} from "../api/bookingApi";
import "./MyAppointments.css";

/* ---------- helpers ---------- */
const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};
const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const getApptId = (a) => a?._id || a?.id || a?.appointmentId;
const getApptStartISO = (a) => a?.start || a?.slotISO || a?.startTime;
const getApptDoctor = (a) => {
  const doc = a?.doctor || {};
  const name = doc.doctorName || doc.name || a?.doctorName || "-";
  const spec = doc.specialization || a?.specialization || a?.specialty || "-";
  const docId = doc.doctorUserId || doc.doctorId || doc._id || a?.doctorUserId || a?.doctorId;
  return { name, spec, id: docId };
};
const statusIsBooked = (s) => {
  const x = (s || "").toLowerCase();
  return !(x.includes("cancel") || x === "completed" || x === "complete");
};
const decodeJwt = (t) => {
  try {
    const p = t.split(".")[1];
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(b64 + pad));
  } catch { return null; }
};
const claimId = (c) =>
  c?.sub || c?._id || c?.id || c?.userId || c?.uid || c?.user?._id || c?.user?.id || null;

/* ---------- Modal via portal ---------- */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  };
  const panel = {
    width: "min(720px, 95vw)", background: "#fff", borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)", padding: 20, maxHeight: "90vh", overflow: "auto",
  };
  return createPortal(
    <div style={overlay} onClick={onClose} aria-modal="true" role="dialog">
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ---------- component ---------- */
export default function MyAppointments() {
  const [patientUserId, setPatientUserId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Edit modal state
  const [editing, setEditing] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [slotChoices, setSlotChoices] = useState([]);
  const [newTimeISO, setNewTimeISO] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [changeReason, setChangeReason] = useState("");

  /* resolve patientUserId once (getMe → JWT fallback) */
  useEffect(() => {
    (async () => {
      try {
        const u = await getMe();
        if (u?._id) { setPatientUserId(u._id); return; }
      } catch {/* ignore */}
      const t = localStorage.getItem("jwt");
      if (t) {
        const pid = claimId(decodeJwt(t));
        if (pid) { setPatientUserId(pid); return; }
      }
      setErr("You must be signed in to view appointments.");
      setLoading(false);
    })();
  }, []);

  /* fetch list for this patient */
  useEffect(() => {
    if (!patientUserId) return;
    (async () => {
      try {
        setLoading(true);
        const list = await getMyAppointments(patientUserId);
        setItems((Array.isArray(list) ? list : []).filter((a) => statusIsBooked(a.status)));
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientUserId]);

  const refresh = async () => {
    const list = await getMyAppointments(patientUserId);
    setItems((Array.isArray(list) ? list : []).filter((a) => statusIsBooked(a.status)));
  };

  /* edit flow */
  const onEdit = (appt) => {
    setEditing(appt);
    setNewDate("");
    setSlotChoices([]);
    setNewTimeISO("");
    setChangeReason("");
  };
  const onCancelEdit = () => {
    setEditing(null);
    setNewDate("");
    setSlotChoices([]);
    setNewTimeISO("");
    setChangeReason("");
  };

  // Normalize a doctor object from search results and extract slots for a date
  const extractSlots = (doc, yyyyMmDd) => {
    if (!doc) return [];
    const byDate =
      (doc.byDate && (doc.byDate[yyyyMmDd] || doc.byDate[yyyyMmDd.replace(/-/g, "/")])) ||
      (doc.scheduleByDate && (doc.scheduleByDate[yyyyMmDd] || doc.scheduleByDate[yyyyMmDd.replace(/-/g, "/")]));
    const raw =
      doc.availableSlots ||
      doc.slots ||
      byDate ||
      doc.availability ||
      [];
    const normalized = (Array.isArray(raw) ? raw : [])
      .map((s) => (typeof s === "string" ? s : (s?.start || s?.startTime || s?.iso || null)))
      .filter(Boolean);
    const uniq = Array.from(new Set(normalized));
    return uniq.sort((a, b) => new Date(a) - new Date(b));
  };

  // Fetch free slots for this doctor at yyyy-mm-dd (robust)
  const fetchSlotsForDate = async (yyyyMmDd) => {
    if (!editing) return;
    setLoadingSlots(true);
    setSlotChoices([]);
    setNewTimeISO("");
    try {
      const docInfo = getApptDoctor(editing);

      // 1) Try with a precise doctor id (if backend supports it)
      let res = null;
      if (docInfo.id) {
        try {
          res = await searchDoctors({
            doctorUserId: docInfo.id,
            date: yyyyMmDd,
            page: 1,
            limit: 1,
          });
        } catch {/* fall through */}
      }

      // 2) Fallback: search by name/spec with higher limit then match client-side
      if (!res || !(Array.isArray(res?.items) ? res.items.length : Array.isArray(res) ? res.length : 0)) {
        res = await searchDoctors({
          name: docInfo.name,
          specialty: docInfo.spec,
          date: yyyyMmDd,
          page: 1,
          limit: 100, // wider net so we can find the right doctor
        });
      }

      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      // try to find exact match by id first, then by name includes
      const found =
        list.find((d) => {
          const id = d.doctorUserId || d.doctorId || d._id;
          return docInfo.id && id && String(id) === String(docInfo.id);
        }) ||
        list.find((d) => {
          const name = (d.doctorName || d.name || "").toLowerCase();
          return name && docInfo.name && name.includes(String(docInfo.name).toLowerCase());
        }) ||
        list[0] || null;

      const slots = extractSlots(found, yyyyMmDd);
      setSlotChoices(slots);
    } catch {/* ignore */} finally {
      setLoadingSlots(false);
    }
  };

  const onChangeDate = async (e) => {
    const v = e.target.value; // yyyy-mm-dd
    setNewDate(v);
    if (v) await fetchSlotsForDate(v);
  };

  const onSaveEdit = async () => {
    const id = getApptId(editing);
    if (!id || !newDate || !newTimeISO) return;
    try {
      await editAppointment(
        id,
        { start: newTimeISO, reason: changeReason || undefined },
        patientUserId
      );
      alert("Appointment updated!");
      await refresh();
      onCancelEdit();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to update appointment");
    }
  };

  const onCancelAppt = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await cancelAppointmentApi(id, patientUserId);
      alert("Appointment cancelled.");
      await refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to cancel appointment");
    }
  };

  const hasRows = useMemo(() => items.length > 0, [items]);

  return (
    <div className="myappts-page">
      <h1 className="myappts-title">My Appointments</h1>

      <div className="myappts-card">
        <table className="myappts-table">
          <thead>
            <tr>
              <th className="center">Date</th>
              <th className="center">Time</th>
              <th>Doctor</th>
              <th className="center col-actions">Actions</th>
            </tr>
          </thead>
        <tbody>
            {loading && (
              <tr><td colSpan={4} className="muted center">Loading…</td></tr>
            )}
            {!loading && err && (
              <tr><td colSpan={4} className="muted center">{err}</td></tr>
            )}
            {!loading && !err && !hasRows && (
              <tr><td colSpan={4} className="muted center">No upcoming appointments.</td></tr>
            )}
            {!loading && !err && items.map((a) => {
              const id = getApptId(a);
              const startISO = getApptStartISO(a);
              const doc = getApptDoctor(a);
              return (
                <tr key={id}>
                  <td className="center body20">{fmtDate(startISO)}</td>
                  <td className="center body20">{fmtTime(startISO)}</td>
                  <td className="doctor-cell">
                    <div className="doc-name body20">{doc.name}</div>
                    <div className="doc-spec body20">{doc.spec}</div>
                  </td>
                  <td className="center actions">
                    <button className="btn btn-style btn-edit" onClick={() => onEdit(a)}>Edit</button>
                    <button className="btn btn-style btn-cancel" onClick={() => onCancelAppt(id)}>Cancel</button>
                  </td>
                </tr>
              );
            })}
        </tbody>
        </table>
      </div>

      {/* ---------- EDIT MODAL (Portal) ---------- */}
      <Modal open={!!editing} onClose={onCancelEdit}>
        {editing && (
          <>
            <h2 className="modal-title" style={{ marginTop: 0 }}>Edit Appointment</h2>

            <div className="summary" style={{ marginBottom: 12 }}>
              <div className="row" style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <div className="label" style={{ minWidth: 70, fontWeight: 600 }}>Doctor:</div>
                <div className="value">
                  {getApptDoctor(editing).name} – {getApptDoctor(editing).spec}
                </div>
              </div>

              <div className="row two" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr auto 1fr", gap: 8 }}>
                <div className="label" style={{ fontWeight: 600 }}>Date:</div>
                <div className="value">{fmtDate(getApptStartISO(editing))}</div>
                <div className="spacer" />
                <div className="label" style={{ fontWeight: 600 }}>Time:</div>
                <div className="value">{fmtTime(getApptStartISO(editing))}</div>
                <div className="spacer" />
                <div className="label" style={{ fontWeight: 600 }}>Duration:</div>
                <div className="value">60 mins</div>
              </div>
            </div>

            <div className="form-grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <div className="field">
                <label className="field-label">New Date</label>
                <input
                  type={newDate ? "date" : "text"}
                  className="input input-like-date"
                  value={newDate}
                  placeholder="Select Date"
                  onFocus={(e) => {
                    if (!newDate) e.target.type = "date";
                    e.target.min = new Date().toISOString().slice(0, 10);
                  }}
                  onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                  onChange={onChangeDate}
                />
              </div>

              <div className="field">
                <label className="field-label">New Time</label>
                <select
                  className="input input-like-date"
                  disabled={!newDate || loadingSlots || slotChoices.length === 0}
                  value={newTimeISO}
                  onChange={(e) => setNewTimeISO(e.target.value)}
                >
                  <option value="" hidden>
                    {loadingSlots ? "Loading…" : slotChoices.length ? "Select Time" : "No slots"}
                  </option>
                  {slotChoices.map((iso) => (
                    <option key={iso} value={iso}>{fmtTime(iso)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field full" style={{ marginTop: 12 }}>
              <label className="field-label">Reason For Change (Optional)</label>
              <input
                className="input"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>

            <div className="modal-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-lg cancel-edit-style btn-cancel-lg" onClick={onCancelEdit}>
                Close
              </button>
              <button
                className="btn-lg cancel-edit-style btn-save"
                onClick={onSaveEdit}
                disabled={!newDate || !newTimeISO}
              >
                Save
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
