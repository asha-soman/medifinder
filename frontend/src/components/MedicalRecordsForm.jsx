import React, { useEffect, useState } from "react";

export default function MedicalRecordForm({ appointment, onSave }) {
    const [medicalSummary, setSummary] = useState("");
    const [prescriptionFile, setFile] = useState(null);

    useEffect(() => {
        // reset when a new appointment is opened
        setSummary("");
        setFile(null);
    }, [appointment?._id]);

    if (!appointment)
        return (
            <div style={{ color: "#666" }}>
                Select a patient from the list to open the appointment form.
            </div>
        );

    const when = new Date(appointment.startTime).toLocaleString();

    return (
        <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Appointment Form</div>

            <label style={{ fontSize: 12, color: "#444" }}>
                Patient Name
                <input
                    readOnly
                    value={appointment.patient?.user?.name || ""}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
                />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#444" }}>
                    Date
                    <input
                        readOnly
                        value={new Date(appointment.startTime).toLocaleDateString()}
                        style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
                    />
                </label>
                <label style={{ fontSize: 12, color: "#444" }}>
                    Time
                    <input
                        readOnly
                        value={new Date(appointment.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
                    />
                </label>
            </div>

            <label style={{ fontSize: 12, color: "#444" }}>
                Medical Summary
                <textarea
                    rows={8}
                    placeholder="Add diagnosis, notes, medication summary..."
                    value={medicalSummary}
                    onChange={(e) => setSummary(e.target.value)}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
                />
            </label>

            <div>
                <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>Prescription</div>
                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <small style={{ display: "block", color: "#666" }}>
                    Upload a prescription document (optional).
                </small>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                    style={{ background: "#e5e7eb" }}
                    onClick={() => {
                        setSummary("");
                        setFile(null);
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={() =>
                        onSave({ medicalSummary, prescriptionFile, appointmentId: appointment._id })
                    }
                >
                    Save
                </button>
            </div>

            <small style={{ color: "#666" }}>
                Selected: {appointment.patient?.user?.name || "—"} | {when}
            </small>
        </div>
    );
}
