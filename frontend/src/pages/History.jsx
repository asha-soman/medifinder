// frontend/src/pages/History.jsx
import React, { useEffect, useState } from "react";

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/history"); // proxy to backend
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Expect array of completed appointments
        if (mounted) {
          setItems(Array.isArray(data) ? data : data.items || []);
        }
      } catch (e) {
        if (mounted) {
          setErr("Could not load history.");
          // fallback demo data
          setItems([
            {
              _id: "demo1",
              date: "2025-10-14T12:00:00.000Z",
              doctor: "Dr. Hannah Grace Muyo Fojas",
              status: "Completed",
            },
            {
              _id: "demo2",
              date: "2025-11-15T08:00:00.000Z",
              doctor: "Dr. Lukas Nikko Fojas",
              status: "Completed",
            },
            {
              _id: "demo3",
              date: "2025-11-30T09:00:00.000Z",
              doctor: "Dr. Raphael Cai Fojas",
              status: "Completed",
            },
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Appointments History</h1>

      {loading && <div style={styles.note}>Loading…</div>}
      {err && <div style={styles.warn}>{err}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Doctor</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a._id || a.date}>
                <td style={styles.td}>{formatDate(a.date || a.updatedAt)}</td>
                <td style={styles.td}>{formatTime(a.date || a.updatedAt)}</td>
                <td style={styles.td}>{a.doctor || a.doctorName}</td>
                <td style={styles.td}>
                  <span style={styles.badge}>
                    {a.status || "Completed"}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={4}>
                  No history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** --- inline styles to match your Figma --- */
const styles = {
  page: {
    maxWidth: 980,
    margin: "32px auto",
    padding: "0 24px",
  },
  h1: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 20,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 15,
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontWeight: 700,
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
  },
  badge: {
    display: "inline-block",
    background: "#65a30d",
    color: "white",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  note: {
    marginBottom: 12,
    fontSize: 14,
    color: "#334155",
  },
  warn: {
    marginBottom: 12,
    fontSize: 14,
    color: "#991b1b",
  },
};
