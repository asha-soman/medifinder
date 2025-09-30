// import React, { useEffect, useState } from "react";
// import { listAvailability, addAvailability, deleteAvailability } from "../api/doctorApi";

// export default function DoctorCalendar() {
//     const [items, setItems] = useState([]);
//     const [form, setForm] = useState({ date: "", startTime: "", endTime: "", isBlocked: false });

//     async function load() { setItems(await listAvailability()); }
//     useEffect(() => { load(); }, []);

//     const addSlot = async (e) => {
//         e.preventDefault();
//         await addAvailability(form);
//         setForm({ date: "", startTime: "", endTime: "", isBlocked: false });
//         await load();
//     };

//     const del = async (id) => { await deleteAvailability(id); await load(); };

//     return (
//         <div style={{ padding: 16 }}>
//             <div style={{ height: 54, background: "#0f172a", borderRadius: 8, marginBottom: 16, color: "white", display: "flex", alignItems: "center", padding: "0 16px" }}>
//                 <div style={{ fontWeight: 600 }}>MediFinder</div>
//                 <div style={{ marginLeft: "auto", opacity: 0.9 }}>My Appointments · Manage Schedule · History · Profile</div>
//             </div>

//             <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
//                 <div style={{ fontWeight: 700, marginBottom: 16 }}>Add Availability</div>
//                 <form onSubmit={addSlot} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12 }}>
//                     <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
//                     <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
//                     <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
//                     <button>Add</button>
//                     <label style={{ gridColumn: "1 / span 4", display: "flex", alignItems: "center", gap: 8 }}>
//                         <input type="checkbox" checked={form.isBlocked} onChange={(e) => setForm({ ...form, isBlocked: e.target.checked })} />
//                         Block this slot (patients cannot book)
//                     </label>
//                 </form>
//             </div>

//             <div style={{ marginTop: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
//                 <div style={{ fontWeight: 700, marginBottom: 12 }}>Availability Window</div>
//                 <table width="100%" style={{ borderCollapse: "collapse" }}>
//                     <thead>
//                         <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
//                             <th style={{ padding: "10px 6px" }}>Date</th>
//                             <th>Time</th>
//                             <th>Status</th>
//                             <th style={{ textAlign: "right" }}>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {items.map((s) => {
//                             const date = new Date(s.date).toLocaleDateString();
//                             const t = `${s.startTime} - ${s.endTime}`;
//                             const status = s.isBlocked ? "Blocked" : "Available";
//                             return (
//                                 <tr key={s._id} style={{ borderBottom: "1px solid #f3f3f3" }}>
//                                     <td style={{ padding: "10px 6px" }}>{date}</td>
//                                     <td>{t}</td>
//                                     <td>{status}</td>
//                                     <td style={{ textAlign: "right" }}>
//                                         <div style={{ display: "inline-flex", gap: 8 }}>
//                                             {/* Edit could open a modal; keeping simple, you can patch inline */}
//                                             <button onClick={() => alert("Implement edit modal (PATCH /doctor/availability/:id)")}>
//                                                 Edit
//                                             </button>
//                                             <button onClick={() => del(s._id)}>Cancel</button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                         {!items.length && (
//                             <tr>
//                                 <td colSpan="4" style={{ padding: 12, color: "#666" }}>
//                                     No availability yet.
//                                 </td>
//                             </tr>
//                         )}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// }
// import React, { useEffect, useState } from "react";
// import { listAvailability, addAvailability, deleteAvailability, updateAvailability } from "../api/doctorApi";

// export default function DoctorAvailability() {
//     const [form, setForm] = useState({ date: "", startTime: "", endTime: "", isBlocked: false });
//     const [items, setItems] = useState([]);
//     const [editing, setEditing] = useState(null);

//     async function load() { setItems(await listAvailability()); }
//     useEffect(() => { load(); }, []);

//     async function onSubmit(e) {
//         e.preventDefault();
//         if (editing) {
//             await updateAvailability(editing, form);
//             setEditing(null);
//         } else {
//             await addAvailability(form);
//         }
//         setForm({ date: "", startTime: "", endTime: "", isBlocked: false });
//         await load();
//     }

//     return (
//         <div style={{ padding: 16 }}>
//             <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
//                 <div style={{ fontWeight: 700, marginBottom: 12 }}>
//                     {editing ? "Edit Availability" : "Add Availability"}
//                 </div>
//                 <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12 }}>
//                     <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
//                     <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
//                     <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
//                     <button>{editing ? "Update" : "Add"}</button>
//                     <label style={{ gridColumn: "1 / span 4" }}>
//                         <input type="checkbox" checked={form.isBlocked} onChange={e => setForm({ ...form, isBlocked: e.target.checked })} />
//                         &nbsp;Block this slot (patients cannot book)
//                     </label>
//                 </form>
//             </section>

//             <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff", marginTop: 16 }}>
//                 <div style={{ fontWeight: 700, marginBottom: 12 }}>Availability Window</div>
//                 <table width="100%" style={{ borderCollapse: "collapse" }}>
//                     <thead>
//                         <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
//                             <th style={{ padding: "10px 6px" }}>Date</th>
//                             <th>Time</th>
//                             <th>Status</th>
//                             <th style={{ textAlign: "right" }}>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {items.map(s => {
//                             const d = s.date ? new Date(s.date).toLocaleDateString() : "—";
//                             const t = `${s.startTime} - ${s.endTime}`;
//                             return (
//                                 <tr key={s._id} style={{ borderBottom: "1px solid #f3f3f3" }}>
//                                     <td style={{ padding: "10px 6px" }}>{d}</td>
//                                     <td>{t}</td>
//                                     <td>{s.isBlocked ? "Blocked" : "Available"}</td>
//                                     <td style={{ textAlign: "right" }}>
//                                         <div style={{ display: "inline-flex", gap: 8 }}>
//                                             <button onClick={() => { setEditing(s._id); setForm({ date: s.date?.slice(0, 10) || "", startTime: s.startTime, endTime: s.endTime, isBlocked: s.isBlocked }); }}>
//                                                 Edit
//                                             </button>
//                                             <button onClick={async () => { await deleteAvailability(s._id); await load(); }}>
//                                                 Delete
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                         {!items.length && <tr><td colSpan="4" style={{ padding: 12, color: "#666" }}>No availability yet.</td></tr>}
//                     </tbody>
//                 </table>
//             </section>
//         </div>
//     );
// }


