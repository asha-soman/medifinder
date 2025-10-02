import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
    fetchAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
} from "../api/doctor";
import "./DoctorAvailability.css";

// helpers
function todayYMD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Make date = UTC midnight for the calendar day (prevents UTC “previous day” drift)
function ymdToISOStartUTC(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

// local-date + hh:mm → ISO in your local timezone (this is fine)
function combine(ymd, hhmm) {
    const [y, m, d] = ymd.split("-").map(Number);
    const [hh, mm] = hhmm.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}
function isoToHHmm(iso) {
    const t = new Date(iso);
    return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function isoToLocalTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DoctorAvailability() {
    const { token } = useAuth();

    // form state
    const [dateInput, setDateInput] = useState(todayYMD());
    const [start, setStart] = useState("09:00");
    const [end, setEnd] = useState("10:00");
    const [isBlocked, setIsBlocked] = useState(false);

    // table state
    const [rows, setRows] = useState([]); // dto.blocks
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // edit state
    const [editingId, setEditingId] = useState(null);
    const [editStart, setEditStart] = useState("");
    const [editEnd, setEditEnd] = useState("");
    const [editBlocked, setEditBlocked] = useState(false);

    const load = useCallback(async () => {
        try {
            setErr("");
            setLoading(true);
            const dto = await fetchAvailability(ymdToISOStartUTC(dateInput), token);
            setRows(dto?.blocks || []);
        } catch (e) {
            setErr(e?.message || "Failed to load availability");
        } finally {
            setLoading(false);
        }
    }, [dateInput, token]);

    useEffect(() => {
        load();
    }, [load]);

    async function onAdd(e) {
        e.preventDefault();
        try {
            setErr("");
            await createAvailability({
                date: ymdToISOStartUTC(dateInput),
                startTime: combine(dateInput, start),
                endTime: combine(dateInput, end),
                isBlocked
            }, token);
            setStart("09:00"); setEnd("10:00"); setIsBlocked(false);
            await load();
        } catch (e) {
            setErr(e?.message || "Failed to save");
        }
    }

    function beginEdit(r) {
        setEditingId(r.id);
        setEditStart(isoToHHmm(r.startTime));
        setEditEnd(isoToHHmm(r.endTime));
        setEditBlocked(!!r.isBlocked);
    }
    function cancelEdit() { setEditingId(null); }

    async function saveEdit(id) {
        try {
            await updateAvailability(id, {
                date: ymdToISOStartUTC(dateInput),
                startTime: combine(dateInput, editStart),
                endTime: combine(dateInput, editEnd),
                isBlocked: editBlocked
            }, token);
            setEditingId(null);
            await load();
        } catch (e) {
            alert(e?.message || "Failed to update");
        }
    }

    async function remove(id) {
        if (!window.confirm("Delete this availability?")) return;
        try {
            await deleteAvailability(id, token);
            await load();
        } catch (e) {
            alert(e?.message || "Failed to delete");
        }
    }

    const header = useMemo(() => (
        <header style={{ marginBottom: 12 }}>
            <h2 className="header-title">Manage Availability</h2>
            <div className="header-body">
                Choose a date, add time windows, edit or delete them.
            </div>
        </header>
    ), []);

    return (
        <div className="main-container">
            {header}

            <section className="availability-section">
                {/* Left: form */}
                <form className="left-form" id="availability-interaction-window" onSubmit={onAdd}>
                    <div className="form-title">Add Availability</div>

                    <label className="form-label">
                        <div className="form-label-value">Date</div>
                        <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} required />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <label className="form-label">
                            <div className="form-label-value">Start</div>
                            <input type="time" value={start} onChange={e => setStart(e.target.value)} required />
                        </label>
                        <label className="form-label">
                            <div className="form-label-value">End</div>
                            <input type="time" value={end} onChange={e => setEnd(e.target.value)} required />
                        </label>
                    </div>

                    <label className="form-label block-checkbox">
                        <input type="checkbox" checked={isBlocked} onChange={e => setIsBlocked(e.target.checked)} />
                        <span>Block this time (not open for booking)</span>
                    </label>

                    <div>
                        <button className="availability-save btn btn-success btn-md fw-semibold" type="submit">Save</button>
                    </div>

                    {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
                </form>

                {/* Right: table */}
                <div className="right-form" id="availability-display-window">
                    <div className="form-title">Availability for {dateInput}</div>

                    {loading ? (
                        <div>Loading…</div>
                    ) : (
                        <table className="availability-summary-table" width="100%" style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ textAlign: "center", borderBottom: "1px solid #eee" }}>
                                    <th style={{ padding: "10px 6px" }}>Start</th>
                                    <th>End</th>
                                    <th>Blocked</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: 12, color: "#666" }}>No availability for this date.</td></tr>
                                )}

                                {rows.map(r => {
                                    const editing = editingId === r.id;
                                    return (
                                        <tr key={r.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                                            <td style={{ padding: "10px 6px" }}>
                                                {editing ? (
                                                    <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} />
                                                ) : isoToLocalTime(r.startTime)}
                                            </td>
                                            <td>
                                                {editing ? (
                                                    <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                                                ) : isoToLocalTime(r.endTime)}
                                            </td>
                                            <td>
                                                {editing ? (
                                                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                        <input type="checkbox" checked={editBlocked} onChange={e => setEditBlocked(e.target.checked)} />
                                                        <span>Blocked</span>
                                                    </label>
                                                ) : (r.isBlocked ? "Yes" : "No")}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                {editing ? (
                                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                                        <button className="btn btn-style btn-success btn-md fw-semibold" onClick={() => saveEdit(r.id)}>Save</button>
                                                        <button className="btn btn-style btn-delete-cancel" onClick={cancelEdit}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                                        <button className="btn btn-style btn-edit" onClick={() => beginEdit(r)}>Edit</button>
                                                        <button className="btn btn-style btn-delete-cancel" onClick={() => remove(r.id)}>Delete</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
}

