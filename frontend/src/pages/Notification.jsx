// frontend/src/pages/Notification.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

/* =========================
   AXIOS CLIENT + TOKEN
   ========================= */
const api = axios.create({
  baseURL: "http://localhost:5001/api", // your local backend
  withCredentials: false,               // header-based auth (not cookies)
});

function getToken() {
  // Try common keys; adjust if your login uses another one
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

// Attach token to every request and log a preview for debugging
api.interceptors.request.use((config) => {
  const t = getToken();
  console.log("🔐 JWT (first 24 chars):", t ? t.slice(0, 24) + "..." : "(none)");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

/* =========================
   UTIL HELPERS
   ========================= */
function formatDateTime(iso) {
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
    return iso;
  }
}

function BellIcon({ muted = false }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flex: "0 0 28px" }}
      fill={muted ? "#94a3b8" : "#0f172a"}
    >
      <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .52-.2 1.02-.57 1.39L4 14h16l-1.43-1.52a2 2 0 0 1-.57-1.39V8a6 6 0 0 0-6-6z" />
      <path d="M8.46 16a3.5 3.5 0 0 0 7.08 0H8.46z" />
    </svg>
  );
}

/* =========================
   PAGE COMPONENT
   ========================= */
export default function Notification() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    (async function load() {
      setLoading(true);
      setErr("");

      try {
        // Backend route mounted at app.use("/api/notifications", ...)
        const res = await api.get("/notifications");

        const rows = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : [];

        if (mounted) setItems(rows);
      } catch (e) {
        const status = e?.response?.status;
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Unknown error";

        // show exact error on screen
        setErr(`(${status || "no-status"}) ${msg}`);

        // and log full context
        console.log("Notifications error:", {
          url: "/notifications",
          status,
          data: e?.response?.data,
          headers: e?.response?.headers,
        });

        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.pageWrap}>
      <h1 style={styles.h1}>Notification</h1>

      {loading && <div style={styles.note}>Loading…</div>}
      {!!err && <div style={styles.noteWarn}>{err}</div>}

      <div style={styles.list}>
        {items.map((n) => (
          <article key={n._id || n.createdAt} style={styles.card}>
            <div style={styles.iconWrap}>
              <BellIcon muted={!!n.read} />
            </div>
            <div style={styles.textWrap}>
              <p style={styles.msg}>
                {n.message
                  ? n.message
                  : `Your booking is confirmed${
                      n.doctorName ? ` with ${n.doctorName}` : ""
                    }${
                      n.appointmentTime
                        ? ` on ${formatDateTime(n.appointmentTime)}`
                        : n.createdAt
                        ? ` on ${formatDateTime(n.createdAt)}`
                        : ""
                    }.`}
              </p>
            </div>
          </article>
        ))}

        {!loading && items.length === 0 && !err && (
          <div style={styles.note}>No notifications yet.</div>
        )}
      </div>

      <div style={{ height: 48 }} />
    </div>
  );
}

/* =========================
   STYLES
   ========================= */
const styles = {
  pageWrap: { maxWidth: 980, margin: "32px auto 0", padding: "0 24px" },
  h1: { fontSize: 22, fontWeight: 700, margin: "8px 0 20px" },
  list: { display: "grid", gap: 24 },
  card: {
    display: "grid",
    gridTemplateColumns: "28px 1fr",
    alignItems: "center",
    gap: 20,
    padding: "18px 20px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
  },
  iconWrap: { display: "flex", alignItems: "center", justifyContent: "center" },
  textWrap: { display: "flex", flexDirection: "column" },
  msg: {
    margin: 0,
    fontWeight: 700,
    fontSize: 18,
    lineHeight: 1.4,
    color: "#0f172a",
    letterSpacing: "0.1px",
  },
  note: {
    padding: "10px 12px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    color: "#334155",
    fontSize: 14,
  },
  noteWarn: {
    padding: "10px 12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 14,
    marginBottom: 12,
  },
};
