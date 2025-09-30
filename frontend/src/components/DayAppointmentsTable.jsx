import React from "react";

export default function DayAppointmentsTable({
    items,
    onOpen,
    onAction, // (id, action) => void
}) {
    return (
        <div>
            <table width="100%" style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                        <th style={{ padding: "10px 6px" }}>Patient Name</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((a) => {
                        const time = new Date(a.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                        const date = new Date(a.startTime).toLocaleDateString();
                        return (
                            <tr key={a._id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                                <td style={{ padding: "10px 6px" }}>
                                    <button
                                        onClick={() => onOpen(a)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "#1d4ed8",
                                            cursor: "pointer",
                                            padding: 0,
                                        }}
                                        title="Open appointment form"
                                    >
                                        {a.patient?.user?.name || "Patient"}
                                    </button>
                                </td>
                                <td>{date}</td>
                                <td>{time}</td>
                                <td>{a.reason || "—"}</td>
                                <td>{a.status}</td>
                                <td style={{ textAlign: "right" }}>
                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                        <button onClick={() => onAction(a._id, "complete")}>
                                            Completed
                                        </button>
                                        <button onClick={() => onAction(a._id, "cancel")}>
                                            Cancel
                                        </button>
                                        <button onClick={() => onAction(a._id, "reschedule")}>
                                            Reschedule
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {!items.length && (
                        <tr>
                            <td colSpan="6" style={{ padding: 12, color: "#666" }}>
                                No appointments for this day.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
