import React, { useEffect, useState, useCallback } from "react";
import { getDoctorAppointments, updateAppointmentStatus } from "../api/doctorAppointments";
import { getRecordByAppointment, saveMedicalRecord } from "../api/doctorRecords";
import "./DoctorAvailability.css";

export default function DoctorAppointments() {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [appointments, setAppointments] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loadingRec, setLoadingRec] = useState(false);
    const [recordForm, setRecordForm] = useState({ medicalSummary: "", prescriptionUrl: "" });
    const [err, setErr] = useState("");

    const load = useCallback(async () => {
        const data = await getDoctorAppointments(date);
        setAppointments(data);
    }, [date]);

    useEffect(() => {
        setSelected(null);
        load();
    }, [load]);

    async function handleStatus(id, status) {
        try {
            await updateAppointmentStatus(id, status);
            await load();
        } catch (e) {
            alert(e?.response?.data?.error || e.message);
        }
    }

    async function openForm(appt) {
        setSelected(appt);
        setRecordForm({ medicalSummary: "", prescriptionUrl: "" });
        setErr("");
        setLoadingRec(true);
        try {
            const rec = await getRecordByAppointment(appt.id);
            setRecordForm({
                medicalSummary: rec.medicalSummary || "",
                prescriptionUrl: rec.prescriptionUrl || "",
            });
        } catch (e) {
            // 404 is fine (no record yet)
        } finally {
            setLoadingRec(false);
        }
    }

    async function onSave() {
        try {
            setErr("");
            await saveMedicalRecord({
                appointmentId: selected.id,
                medicalSummary: recordForm.medicalSummary,
                prescriptionUrl: recordForm.prescriptionUrl,
            });
            alert("Record saved");
        } catch (e) {
            setErr(e?.response?.data?.error || e.message);
        }
    }

    return (
        <div className="main-container">
            <h2 className="header-title">My Appointments</h2>
            <label className="header-body">
                Pick a date:{" "}
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>

            <table className="appointment-summary-table" style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "center", borderBottom: "1px solid #ddd" }}>
                        <th style={{ padding: "20px 6px" }}>Patient</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map(a => (
                        <tr key={a.id} style={{ textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "30px 6px" }}>{a.patient?.name || "—"}</td>
                            <td>{new Date(a.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>{new Date(a.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>{a.reason || "—"}</td>
                            <td>{a.status}</td>
                            <td style={{ textAlign: "center" }}>
                                <div style={{ display: "inline-flex", gap: 8 }}>
                                    <button className="btn btn-style btn-width btn-success btn-md fw-semibold" onClick={() => handleStatus(a.id, "COMPLETED")}>Mark Completed</button>
                                    <button className="btn btn-style btn-width btn-delete-cancel" onClick={() => handleStatus(a.id, "CANCELLED")}>Cancel</button>
                                    <button className="btn-style btn-width btn-open-form" onClick={() => openForm(a)}>Open Form</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {!appointments.length && (
                        <tr style={{ padding: "10px 6px" }}><td colSpan="6" style={{ padding: 12, color: "#666" }}>No appointments for this day</td></tr>
                    )}
                </tbody>
            </table>

            {/* Visit form panel */}
            {selected && (
                <section className="medical-record-summary">
                    <div className="header-body" style={{ fontWeight: 700, marginBottom: 8 }}>
                        Visit Notes — {selected.patient?.name || "Patient"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <label>
                            <div className="form-label-value">Date</div>
                            <input readOnly value={new Date(selected.start).toLocaleDateString()} />
                        </label>
                        <label>
                            <div className="form-label-value">Time</div>
                            <input readOnly value={new Date(selected.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                        </label>
                    </div>

                    {loadingRec ? (
                        <div>Loading existing record…</div>
                    ) : (
                        <>
                            <label style={{ display: "block", marginBottom: 10 }}>
                                <div className="form-label-value">Medical Summary</div>
                                <textarea
                                    rows={6}
                                    value={recordForm.medicalSummary}
                                    onChange={e => setRecordForm({ ...recordForm, medicalSummary: e.target.value })}
                                    style={{ width: "100%" }}
                                />
                            </label>

                            <label style={{ display: "block", marginBottom: 10 }}>
                                <div className="form-label-value">Prescription URL (optional)</div>
                                <input
                                    type="url"
                                    placeholder="https://…"
                                    value={recordForm.prescriptionUrl}
                                    onChange={e => setRecordForm({ ...recordForm, prescriptionUrl: e.target.value })}
                                    style={{ width: "100%" }}
                                />
                            </label>

                            {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}

                            <div style={{ display: "flex", gap: 8, margin: "30px 0", justifyContent: "center" }}>
                                <button className="btn btn-style btn-delete-cancel" onClick={() => setSelected(null)}>Close</button>
                                <button className="btn btn-style btn-success btn-md fw-semibold" onClick={onSave}>Save</button>
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
