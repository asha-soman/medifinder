import React, { useEffect, useState, useCallback } from "react";
import { getDoctorAppointments, updateAppointmentStatus } from "../api/doctorAppointments";
import { getRecordByAppointment, saveMedicalRecord } from "../api/doctorRecords";

export default function DoctorAppointments() {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [appointments, setAppointments] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loadingRec, setLoadingRec] = useState(false);
    const [recordForm, setRecordForm] = useState({ medicalSummary: "", prescriptionUrl: "" });
    const [err, setErr] = useState("");

    useEffect(() => { load(); setSelected(null); }, [date]);

    const load = useCallback(async () => {
        const data = await getDoctorAppointments(date);
        setAppointments(data);
    }, [date]);

    useEffect(() => {
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
                prescriptionUrl: recordForm.prescriptionUrl, // later replace with upload result
            });
            alert("Record saved");
        } catch (e) {
            setErr(e?.response?.data?.error || e.message);
        }
    }

    return (
        <div style={{ padding: 16 }}>
            <h2>My Appointments</h2>
            <label>
                Pick a date:{" "}
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>

            <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        <th>Patient</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map(a => (
                        <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "8px 6px" }}>{a.patient?.name || "—"}</td>
                            <td>{new Date(a.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>{new Date(a.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>{a.reason || "—"}</td>
                            <td>{a.status}</td>
                            <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 8 }}>
                                    <button onClick={() => handleStatus(a.id, "COMPLETED")}>Mark Completed</button>
                                    <button onClick={() => handleStatus(a.id, "CANCELLED")}>Cancel</button>
                                    <button onClick={() => openForm(a)}>Open Form</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {!appointments.length && (
                        <tr><td colSpan="6" style={{ padding: 12, color: "#666" }}>No appointments for this day</td></tr>
                    )}
                </tbody>
            </table>

            {/* Visit form panel */}
            {selected && (
                <section style={{
                    marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff"
                }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        Visit Notes — {selected.patient?.name || "Patient"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                        <label>
                            <div style={{ fontSize: 12, color: "#444" }}>Date</div>
                            <input readOnly value={new Date(selected.start).toLocaleDateString()} />
                        </label>
                        <label>
                            <div style={{ fontSize: 12, color: "#444" }}>Time</div>
                            <input readOnly value={new Date(selected.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                        </label>
                    </div>

                    {loadingRec ? (
                        <div>Loading existing record…</div>
                    ) : (
                        <>
                            <label style={{ display: "block", marginBottom: 10 }}>
                                <div style={{ fontSize: 12, color: "#444" }}>Medical Summary</div>
                                <textarea
                                    rows={6}
                                    value={recordForm.medicalSummary}
                                    onChange={e => setRecordForm({ ...recordForm, medicalSummary: e.target.value })}
                                    style={{ width: "100%" }}
                                />
                            </label>

                            <label style={{ display: "block", marginBottom: 10 }}>
                                <div style={{ fontSize: 12, color: "#444" }}>Prescription URL (optional)</div>
                                <input
                                    type="url"
                                    placeholder="https://…"
                                    value={recordForm.prescriptionUrl}
                                    onChange={e => setRecordForm({ ...recordForm, prescriptionUrl: e.target.value })}
                                    style={{ width: "100%" }}
                                />
                            </label>

                            {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}

                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setSelected(null)}>Close</button>
                                <button onClick={onSave}>Save</button>
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
