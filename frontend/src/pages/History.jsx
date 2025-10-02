import React, { useEffect, useState } from "react";
import api from "../axiosConfig"; // <- the instance above

function fmt(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch { return iso; }
}

export default function History() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await api.get("/history");
        const list = Array.isArray(res.data?.items) ? res.data.items : [];
        if (mounted) setRows(list);
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.error || e?.message || "Unknown error";
        if (mounted) setErr(`Could not load history. (${status || "no-status"}) ${msg}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: "32px auto", padding: "0 24px" }}>
      <h2 style={{ marginBottom: 8 }}>Appointments History</h2>
      {loading && <div style={note}>Loading…</div>}
      {!!err && <div style={noteWarn}>{err}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Time</th>
              <th style={th}>Doctor</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const when = r.completedAt || r.startTime;
              const [date, time] = fmt(when).split(", ");
              return (
                <tr key={r._id}>
                  <td style={td}>{date}</td>
                  <td style={td}>{time}</td>
                  <td style={td}>{r.doctorName || "—"}</td>
                  <td style={td}><span style={pill}>Completed</span></td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td style={td} colSpan={4}>No completed appointments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* styles */
const tbl = { width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 };
const th  = { textAlign: "left", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" };
const td  = { padding: "12px 16px", borderBottom: "1px solid #f3f4f6" };
const pill = { display: "inline-block", padding: "2px 10px", borderRadius: 999, background: "#e9fbe7", color: "#166534", fontWeight: 600, fontSize: 12 };
const note = { padding: "10px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, color: "#334155", fontSize: 14, marginBottom: 12 };
const noteWarn = { padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 14, marginBottom: 12 };
