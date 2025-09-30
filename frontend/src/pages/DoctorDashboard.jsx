// import React, { useEffect, useState } from "react";
// import { useAuth } from "../context/AuthContext";
// import { apiFetch } from "../api/client";

// export default function DoctorDashboard() {
//   const { token, user } = useAuth();
//   const [data, setData] = useState(null);

//   useEffect(() => { apiFetch("/doctor/dashboard", { token }).then(setData); }, [token]);
//   if (!data) return null;

//   return (
//     <div style={{ maxWidth: 640, margin: "24px auto" }}>
//       <h2>Doctor Dashboard</h2>
//       <p>Welcome, Dr. {user?.name}</p>
//       <pre>{JSON.stringify(data, null, 2)}</pre>
//     </div>
//   );
// }
// import React, { useEffect, useState } from "react";
// import { getDoctorAppointments, setAppointmentStatus, saveRecords } from "../api/doctorApi";
// import CalendarNav from "../components/calendarNav";
// import DayAppointmentsTable from "../components/DayAppointmentsTable";
// import MedicalRecordForm from "../components/MedicalRecordsForm";

// export default function DoctorDashboard() {
//   const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
//   const [items, setItems] = useState([]);
//   const [selected, setSelected] = useState(null);

//   async function load() {
//     const data = await getDoctorAppointments({ date, view: "byTime" });
//     setItems(data);
//     if (selected) setSelected(data.find(x => x._id === selected._id) || null);
//   }


//   useEffect(() => {
//     load(); // reload when date changes
//     // eslint-disable-next-line
//   }, [date]);

//   const doAction = async (id, action) => {
//     await setAppointmentStatus(id, action);
//     await load();
//   };


//   const onSaveRecords = async ({ appointmentId, medicalSummary, prescriptionFile }) => {
//     // if you don’t have file upload yet, skip prescriptionFile and send only summary
//     await saveRecords({
//       appointmentId: appointmentId || selected._id,
//       medicalSummary,
//       prescription: undefined
//     });
//     alert("Saved");
//   };


//   return (
//     <div style={{ padding: 16 }}>
//       {/* top nav mimic */}
//       <div style={{ height: 54, background: "#0f172a", borderRadius: 8, marginBottom: 16, color: "white", display: "flex", alignItems: "center", padding: "0 16px" }}>
//         <div style={{ fontWeight: 600 }}>MediFinder</div>
//         <div style={{ marginLeft: "auto", opacity: 0.9 }}>My Appointments · Manage Schedule · History · Profile</div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 1.1fr", gap: 16 }}>
//         {/* Left: Doctor info + calendar */}
//         <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
//           <div style={{ fontWeight: 700, marginBottom: 8 }}>Dr. Hannah Grace Muya Fojas</div>
//           <div style={{ color: "#475569", marginBottom: 16 }}>Cardiologist</div>
//           <CalendarNav date={date} onChange={setDate} />
//         </div>

//         {/* Middle: Upcoming Appointments */}
//         <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
//           <div style={{ fontWeight: 700, marginBottom: 12 }}>Upcoming Appointments</div>
//           <DayAppointmentsTable items={items} onOpen={setSelected} onAction={doAction} />
//         </div>

//         {/* Right: Appointment Form (only shows after a row click) */}
//         <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
//           <MedicalRecordForm appointment={selected} onSave={onSaveRecords} />
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from "react";
import { getDoctorAppointments, setAppointmentStatus, saveRecords } from "../api/doctorApi";
import AuthAPI from "../api/auth"; // you already have this

export default function DoctorDashboard() {
  const [me, setMe] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ medicalSummary: "", prescriptionFile: null });

  useEffect(() => {
    // load doctor info
    AuthAPI.me(localStorage.getItem("token")).then(setMe).catch(() => { });
  }, []);

  async function load() {
    const data = await getDoctorAppointments({ date, view: "byTime" });
    setItems(data);
    if (selected) setSelected(data.find(x => x._id === selected._id) || null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  async function onAction(id, action) {
    await setAppointmentStatus(id, action);
    await load();
  }

  async function onSave() {
    await saveRecords({
      appointmentId: selected._id,
      medicalSummary: form.medicalSummary,
      prescription: undefined // wire later when upload route exists
    });
    alert("Saved");
    setForm({ medicalSummary: "", prescriptionFile: null });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, padding: 16 }}>
      {/* Sidebar */}
      <aside style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
        <div style={{ fontWeight: 700 }}>{me?.name || "Doctor"}</div>
        <div style={{ color: "#475569", marginBottom: 16 }}>{me?.specialization || "Specialization"}</div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Calendar</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <small style={{ color: "#666", display: "block", marginTop: 6 }}>
          Pick a date to load that day’s appointments.
        </small>
      </aside>

      {/* Main */}
      <main style={{ display: "grid", gap: 16 }}>
        {/* Appointments table */}
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming Appointments ({date})</div>
          <table width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "10px 6px" }}>Patient</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => {
                const time = new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const d = new Date(a.startTime).toLocaleDateString();
                return (
                  <tr key={a._id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                    <td style={{ padding: "10px 6px" }}>
                      {a.patient?.user?.name || "Patient"}
                    </td>
                    <td>{d}</td>
                    <td>{time}</td>
                    <td>{a.reason || "—"}</td>
                    <td>{a.status}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button onClick={() => onAction(a._id, "reschedule")}>Reschedule</button>
                        <button onClick={() => onAction(a._id, "cancel")}>Cancel</button>
                        <button onClick={() => setSelected(a)}>Open Form</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr><td colSpan="6" style={{ padding: 12, color: "#666" }}>No appointments.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Appointment form appears under the list ONLY when selected */}
        {selected && (
          <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Appointment Form — {selected.patient?.user?.name || "Patient"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <div style={{ fontSize: 12, color: "#444" }}>Date</div>
                <input readOnly value={new Date(selected.startTime).toLocaleDateString()} />
              </label>
              <label>
                <div style={{ fontSize: 12, color: "#444" }}>Time</div>
                <input readOnly value={new Date(selected.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
              </label>
            </div>
            <label style={{ display: "block", marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#444" }}>Medical Summary</div>
              <textarea
                rows={6}
                value={form.medicalSummary}
                onChange={(e) => setForm({ ...form, medicalSummary: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>Prescription (optional)</div>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setForm({ ...form, prescriptionFile: e.target.files?.[0] || null })}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setSelected(null)}>Close</button>
              <button onClick={onSave}>Save</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}



