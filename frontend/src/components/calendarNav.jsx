import React from "react";

export default function CalendarNav({ date, onChange }) {
    return (
        <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Calendar</div>
            <input
                type="date"
                value={date}
                onChange={(e) => onChange(e.target.value)}
                style={{ padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
            />
            <small style={{ color: "#666" }}>
                Pick a date to load that day’s appointments.
            </small>
        </div>
    );
}
