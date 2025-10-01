// import React, { useEffect, useMemo, useState } from "react";
// import { useAuth } from "../context/AuthContext";
// import {
//     fetchAvailability,
//     createAvailability,
//     updateAvailability,
//     deleteAvailability,
// } from "../api/doctor";

// // helpers
// function todayYMD() {
//     const d = new Date();
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// }
// function ymdToISOStart(ymd) {
//     const [y, m, d] = ymd.split("-").map(Number);
//     return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
// }
// function combine(ymd, hhmm) {
//     const [y, m, d] = ymd.split("-").map(Number);
//     const [hh, mm] = hhmm.split(":").map(Number);
//     return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
// }
// function isoToHHmm(iso) {
//     const t = new Date(iso);
//     return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
// }
// function isoToLocalTime(iso) {
//     return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
// }

// export default function DoctorAvailability() {
//     const { token } = useAuth();

//     // form state
//     const [dateInput, setDateInput] = useState(todayYMD());
//     const [start, setStart] = useState("09:00");
//     const [end, setEnd] = useState("10:00");
//     const [isBlocked, setIsBlocked] = useState(false);

//     // table state
//     const [rows, setRows] = useState([]); // we’ll store dto.blocks here
//     const [loading, setLoading] = useState(true);
//     const [err, setErr] = useState("");

//     // edit state
//     const [editingId, setEditingId] = useState(null);
//     const [editStart, setEditStart] = useState("");
//     const [editEnd, setEditEnd] = useState("");
//     const [editBlocked, setEditBlocked] = useState(false);

//     async function load() {
//         try {
//             setErr("");
//             setLoading(true);
//             const dto = await fetchAvailability(ymdToISOStart(dateInput), token);
//             // dto = { date, blocks: [{id,startTime,endTime,isBlocked}], totals }
//             setRows(dto?.blocks || []);
//         } catch (e) {
//             setErr(e?.message || "Failed to load availability");
//         } finally {
//             setLoading(false);
//         }
//     }
//     useEffect(() => { load(); /* eslint-disable-next-line */ }, [dateInput]);

//     async function onAdd(e) {
//         e.preventDefault();
//         try {
//             setErr("");
//             await createAvailability({
//                 date: ymdToISOStart(dateInput),
//                 startTime: combine(dateInput, start),
//                 endTime: combine(dateInput, end),
//                 isBlocked
//             }, token);
//             setStart("09:00"); setEnd("10:00"); setIsBlocked(false);
//             await load();
//         } catch (e) {
//             setErr(e?.message || "Failed to save");
//         }
//     }

//     function beginEdit(r) {
//         setEditingId(r.id);
//         setEditStart(isoToHHmm(r.startTime));
//         setEditEnd(isoToHHmm(r.endTime));
//         setEditBlocked(!!r.isBlocked);
//     }
//     function cancelEdit() { setEditingId(null); }

//     async function saveEdit(id) {
//         try {
//             await updateAvailability(id, {
//                 // keep the same date as the current filter
//                 date: ymdToISOStart(dateInput),
//                 startTime: combine(dateInput, editStart),
//                 endTime: combine(dateInput, editEnd),
//                 isBlocked: editBlocked
//             }, token);
//             setEditingId(null);
//             await load();
//         } catch (e) {
//             alert(e?.message || "Failed to update");
//         }
//     }

//     async function remove(id) {
//         if (!window.confirm("Delete this availability?")) return;
//         try {
//             await deleteAvailability(id, token);
//             await load();
//         } catch (e) {
//             alert(e?.message || "Failed to delete");
//         }
//     }

//     const header = useMemo(() => (
//         <header style={{ marginBottom: 12 }}>
//             <h2 style={{ margin: 0 }}>Manage Availability</h2>
//             <div style={{ color: "#475569", marginTop: 6 }}>
//                 Choose a date, add time windows, edit or delete them.
//             </div>
//         </header>
//     ), []);

//     return (
//         <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
//             {header}

//             <section style={{
//                 display: "grid",
//                 gridTemplateColumns: "260px 1fr",
//                 gap: 16,
//                 alignItems: "start",
//             }}>
//                 {/* Left: form */}
//                 <form onSubmit={onAdd}
//                     style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
//                     <div style={{ fontWeight: 700, marginBottom: 8 }}>Add Availability</div>

//                     <label style={{ display: "block", marginBottom: 8 }}>
//                         <div style={{ fontSize: 12, color: "#444" }}>Date</div>
//                         <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} required />
//                     </label>

//                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
//                         <label>
//                             <div style={{ fontSize: 12, color: "#444" }}>Start</div>
//                             <input type="time" value={start} onChange={e => setStart(e.target.value)} required />
//                         </label>
//                         <label>
//                             <div style={{ fontSize: 12, color: "#444" }}>End</div>
//                             <input type="time" value={end} onChange={e => setEnd(e.target.value)} required />
//                         </label>
//                     </div>

//                     <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
//                         <input type="checkbox" checked={isBlocked} onChange={e => setIsBlocked(e.target.checked)} />
//                         <span>Block this time (not open for booking)</span>
//                     </label>

//                     <div style={{ marginTop: 12 }}>
//                         <button type="submit">Save</button>
//                     </div>

//                     {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
//                 </form>

//                 {/* Right: table */}
//                 <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
//                     <div style={{ fontWeight: 700, marginBottom: 8 }}>Availability for {dateInput}</div>

//                     {loading ? (
//                         <div>Loading…</div>
//                     ) : (
//                         <table width="100%" style={{ borderCollapse: "collapse" }}>
//                             <thead>
//                                 <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
//                                     <th style={{ padding: "10px 6px" }}>Start</th>
//                                     <th>End</th>
//                                     <th>Blocked?</th>
//                                     <th style={{ textAlign: "right" }}>Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {rows.length === 0 && (
//                                     <tr><td colSpan="4" style={{ padding: 12, color: "#666" }}>No availability for this date.</td></tr>
//                                 )}

//                                 {rows.map(r => {
//                                     const editing = editingId === r.id;
//                                     return (
//                                         <tr key={r.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
//                                             <td style={{ padding: "10px 6px" }}>
//                                                 {editing ? (
//                                                     <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} />
//                                                 ) : isoToLocalTime(r.startTime)}
//                                             </td>
//                                             <td>
//                                                 {editing ? (
//                                                     <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
//                                                 ) : isoToLocalTime(r.endTime)}
//                                             </td>
//                                             <td>
//                                                 {editing ? (
//                                                     <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
//                                                         <input type="checkbox" checked={editBlocked} onChange={e => setEditBlocked(e.target.checked)} />
//                                                         <span>Blocked</span>
//                                                     </label>
//                                                 ) : (r.isBlocked ? "Yes" : "No")}
//                                             </td>
//                                             <td style={{ textAlign: "right" }}>
//                                                 {editing ? (
//                                                     <div style={{ display: "inline-flex", gap: 8 }}>
//                                                         <button onClick={() => saveEdit(r.id)}>Save</button>
//                                                         <button onClick={cancelEdit}>Cancel</button>
//                                                     </div>
//                                                 ) : (
//                                                     <div style={{ display: "inline-flex", gap: 8 }}>
//                                                         <button onClick={() => beginEdit(r)}>Edit</button>
//                                                         <button onClick={() => remove(r.id)}>Delete</button>
//                                                     </div>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     );
//                                 })}
//                             </tbody>
//                         </table>
//                     )}
//                 </div>
//             </section>
//         </div>
//     );
// }

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
    fetchAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
} from "../api/doctor";

// helpers
function todayYMD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ✅ Make date = UTC midnight for the calendar day (prevents UTC “previous day” drift)
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

    async function load() {
        try {
            setErr(""); setLoading(true);
            // 👇 still pass date to the list API; server will filter by startTime range
            const dto = await fetchAvailability(ymdToISOStartUTC(dateInput), token);
            setRows(dto?.blocks || []);
        } catch (e) {
            setErr(e?.message || "Failed to load availability");
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [dateInput]);

    async function onAdd(e) {
        e.preventDefault();
        try {
            setErr("");
            await createAvailability({
                // 👇 store the calendar day as UTC midnight
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
            <h2 style={{ margin: 0 }}>Manage Availability</h2>
            <div style={{ color: "#475569", marginTop: 6 }}>
                Choose a date, add time windows, edit or delete them.
            </div>
        </header>
    ), []);

    return (
        <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
            {header}

            <section style={{
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                gap: 16,
                alignItems: "start",
            }}>
                {/* Left: form */}
                <form onSubmit={onAdd}
                    style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Add Availability</div>

                    <label style={{ display: "block", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#444" }}>Date</div>
                        <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} required />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <label>
                            <div style={{ fontSize: 12, color: "#444" }}>Start</div>
                            <input type="time" value={start} onChange={e => setStart(e.target.value)} required />
                        </label>
                        <label>
                            <div style={{ fontSize: 12, color: "#444" }}>End</div>
                            <input type="time" value={end} onChange={e => setEnd(e.target.value)} required />
                        </label>
                    </div>

                    <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                        <input type="checkbox" checked={isBlocked} onChange={e => setIsBlocked(e.target.checked)} />
                        <span>Block this time (not open for booking)</span>
                    </label>

                    <div style={{ marginTop: 12 }}>
                        <button type="submit">Save</button>
                    </div>

                    {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
                </form>

                {/* Right: table */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Availability for {dateInput}</div>

                    {loading ? (
                        <div>Loading…</div>
                    ) : (
                        <table width="100%" style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                    <th style={{ padding: "10px 6px" }}>Start</th>
                                    <th>End</th>
                                    <th>Blocked?</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
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
                                            <td style={{ textAlign: "right" }}>
                                                {editing ? (
                                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                                        <button onClick={() => saveEdit(r.id)}>Save</button>
                                                        <button onClick={cancelEdit}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                                        <button onClick={() => beginEdit(r)}>Edit</button>
                                                        <button onClick={() => remove(r.id)}>Delete</button>
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

