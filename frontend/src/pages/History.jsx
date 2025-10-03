// frontend/src/pages/History.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../axiosConfig";

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
  } catch {
    return iso || "";
  }
}

export default function History() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // 👇 Force the Authorization header in case the interceptor doesn't run yet
      const res = await api.get("/history", {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt") || ""}` },
      });

      // Accept either { items: [...] } or [...]
      const items = Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data)
        ? res.data
        : [];

      setRows(items);
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Unknown error";
      setErr(`Could not load history. (${status || "no-status"}) ${msg}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 960, margin: "32px auto", padding: "0 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Appointments History</h2>
        <button type="button" style={btnGhost} onClick={load}>Refresh</button>
      </div>

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
              // Support both shapes:
              // new: { start, end, doctor:{name}, status }
              // old: { completedAt or startTime, doctorName }
              const when = r.start || r.completedAt || r.startTime;
              const [date, time] = fmt(when || "").split(", ");
              const doctorName = r?.doctor?.name || r?.doctorName || "—";
              const status = r?.status || "COMPLETED";
              return (
                <tr key={r._id}>
                  <td style={td}>{date || "—"}</td>
                  <td style={td}>{time || "—"}</td>
                  <td style={td}>{doctorName}</td>
                  <td style={td}><span style={pill}>{status}</span></td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && !err && (
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
const btnGhost = { height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" };
