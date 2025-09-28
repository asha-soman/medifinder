// src/pages/MyAppointments.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getMyAppointments,
  searchDoctors,
  editAppointment,
  cancelAppointmentApi,
} from "../api/bookingApi";
import "./MyAppointments.css";

const DEFAULT_PATIENT_ID = "68d7390ee32dab0569ecbf2f"; // mock patient

// DD-MM-YYYY
const fmtDate = (iso) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function MyAppointments() {
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

  // Load upcoming appointments
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await getMyAppointments(DEFAULT_PATIENT_ID);
        setItems(list || []);
      } catch {
        setErr("Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    const list = await getMyAppointments(DEFAULT_PATIENT_ID);
    setItems(list || []);
  };

  /* ---------------- Edit Flow ---------------- */
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

  // Fetch free slots for this doctor at yyyy-mm-dd
  const fetchSlotsForDate = async (yyyyMmDd) => {
    if (!editing?.doctor) return;
    setLoadingSlots(true);
    setSlotChoices([]);
    setNewTimeISO("");
    try {
      const data = await searchDoctors({
        name: editing.doctor.doctorName,
        specialty: editing.doctor.specialty,
        date: yyyyMmDd,
        page: 1,
        limit: 1,
      });
      const doc =
        Array.isArray(data?.items) && data.items.length ? data.items[0] : null;
      const slots = (doc?.availableSlots || []).map((s) =>
        typeof s === "string" ? s : s.start
      );
      setSlotChoices(slots);
    } catch {
      // ignore
    } finally {
      setLoadingSlots(false);
    }
  };

  const onChangeDate = async (e) => {
    const v = e.target.value; // yyyy-mm-dd
    setNewDate(v);
    if (v) await fetchSlotsForDate(v);
  };

  const onSaveEdit = async () => {
    if (!editing?._id || !newDate || !newTimeISO) return;
    try {
      await editAppointment(editing._id, {
        start: newTimeISO,
        reason: changeReason || undefined,
      });
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
      await cancelAppointmentApi(id);
      alert("Appointment cancelled.");
      await refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to cancel appointment");
    }
  };

  const hasRows = useMemo(() => (items || []).length > 0, [items]);

  return (
    <div className="myappts-page">
      <h1 className="myappts-title">Upcoming Appointments</h1>

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
              <tr>
                <td colSpan={4} className="muted center">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && err && (
              <tr>
                <td colSpan={4} className="muted center">
                  {err}
                </td>
              </tr>
            )}
            {!loading && !err && !hasRows && (
              <tr>
                <td colSpan={4} className="muted center">
                  No upcoming appointments.
                </td>
              </tr>
            )}
            {!loading &&
              !err &&
              items.map((a) => (
                <tr key={a._id}>
                  <td className="center body20">{fmtDate(a.start)}</td>
                  <td className="center body20">{fmtTime(a.start)}</td>
                  <td className="doctor-cell">
                    <div className="doc-name body20">
                      {a?.doctor?.doctorName || "-"}
                    </div>
                    <div className="doc-spec body20">
                      {a?.doctor?.specialty || "-"}
                    </div>
                  </td>
                  <td className="center actions">
                    <button className="btn btn-edit" onClick={() => onEdit(a)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-cancel"
                      onClick={() => onCancelAppt(a._id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ---------- EDIT MODAL ---------- */}
      {editing && (
        <div className="modal-backdrop" onClick={onCancelEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Appointment</h2>

            {/* Summary */}
            <div className="summary">
              <div className="row">
                <div className="label">Doctor:</div>
                <div className="value">
                  {editing?.doctor?.doctorName} – {editing?.doctor?.specialty}
                </div>
              </div>

              <div className="row two">
                <div className="label">Date:</div>
                <div className="value">{fmtDate(editing.start)}</div>

                <div className="spacer" />

                <div className="label center-on-row">Time:</div>
                <div className="value">{fmtTime(editing.start)}</div>

                <div className="spacer" />

                <div className="label right-on-row">Duration:</div>
                <div className="value">60 mins</div>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="field-label">New Date</label>
                {/* placeholder 'Select Date' via text->date trick */}
                <input
                  type={newDate ? "date" : "text"}
                  className="input input-like-date"
                  value={newDate}
                  placeholder="Select Date"
                  onFocus={(e) => {
                    if (!newDate) e.target.type = "date";
                    e.target.min = new Date().toISOString().slice(0, 10);
                  }}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  onChange={onChangeDate}
                />
              </div>

              <div className="field">
                <label className="field-label">New Time</label>
                {/* styled like date input */}
                <select
                  className="input input-like-date"
                  disabled={!newDate || loadingSlots || slotChoices.length === 0}
                  value={newTimeISO}
                  onChange={(e) => setNewTimeISO(e.target.value)}
                >
                  <option value="" hidden>
                    {loadingSlots
                      ? "Loading…"
                      : slotChoices.length
                      ? "Select Time"
                      : "No slots"}
                  </option>
                  {slotChoices.map((iso) => (
                    <option key={iso} value={iso}>
                      {fmtTime(iso)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field full">
              <label className="field-label">Reason For Change (Optional)</label>
              <input
                className="input"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder=""
              />
            </div>

            <div className="modal-actions">
              <button className="btn-lg btn-cancel-lg" onClick={onCancelEdit}>
                Cancel
              </button>
              <button
                className="btn-lg btn-save"
                onClick={onSaveEdit}
                disabled={!newDate || !newTimeISO}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
