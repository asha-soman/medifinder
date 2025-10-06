// frontend/src/pages/Notification.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../axiosConfig"; // ✅ use the single shared axios instance

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
    return iso || "";
  }
}

function BellIcon({ muted = false }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flex: "0 0 20px" }}
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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // Backend route should be mounted at: app.use("/api/notifications", ...)
      const res = await api.get("/notifications", {
        // If you later add pagination: params: { page, limit }
      });

      const rows = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : [];

      setItems(rows);
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Unknown error";
      setErr(`(${status || "no-status"}) ${msg}`);
      setItems([]);
      console.log("Notifications error:", {
        url: "/notifications",
        status,
        data: e?.response?.data,
        headers: e?.response?.headers,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.reduce((acc, n) => (n.read ? acc : acc + 1), 0);
  const filtered = showUnreadOnly ? items.filter((n) => !n.read) : items;

  async function markOneRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (String(n._id) === String(id) ? { ...n, read: true } : n))
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed";
      setErr(`Mark read error: ${msg}`);
    }
  }

  async function markAllRead() {
    try {
      await api.patch(`/notifications/read-all`);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed";
      setErr(`Mark-all error: ${msg}`);
    }
  }

  return (
    <div style={styles.pageWrap}>
      <div style={styles.headerRow}>
        <h1 style={styles.h1}>Notifications</h1>
        <div style={styles.headerActions}>
          <span style={styles.badge} title={`${unreadCount} unread`}>
            {unreadCount}
          </span>
          <button
            type="button"
            style={styles.btnGhost}
            onClick={() => setShowUnreadOnly((v) => !v)}
          >
            {showUnreadOnly ? "Show All" : "Show Unread"}
          </button>
          <button type="button" style={styles.btnGhost} onClick={load}>
            Refresh
          </button>
          <button
            type="button"
            style={styles.btnPrimary}
            onClick={markAllRead}
            disabled={unreadCount === 0}
            title="Mark all as read"
          >
            Mark all read
          </button>
        </div>
      </div>

      {loading && <div style={styles.note}>Loading…</div>}
      {!!err && <div style={styles.noteWarn}>{err}</div>}

      <div style={styles.list}>
        {filtered.map((n) => (
          <article
            key={n._id || n.createdAt}
            style={{ ...styles.card, ...(n.read ? styles.cardRead : {}) }}
          >
            <div style={styles.iconWrap}>
              <BellIcon muted={!!n.read} />
            </div>

            <div style={styles.textWrap}>
              <div style={styles.topRow}>
                <span style={styles.typePill}>{n.type || "GENERAL"}</span>
                <time style={styles.time}>
                  {formatDateTime(n.createdAt || n.appointmentTime)}
                </time>
              </div>

              <p style={styles.msg}>
                {n.message
                  ? n.message
                  : `Your booking${
                      n.doctorName ? ` with ${n.doctorName}` : ""
                    }${
                      n.appointmentTime
                        ? ` on ${formatDateTime(n.appointmentTime)}`
                        : ""
                    }.`}
              </p>

              {!n.read && (
                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    style={styles.btnSecondary}
                    onClick={() => markOneRead(n._id)}
                    title="Mark as read"
                  >
                    Mark as read
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}

        {!loading && filtered.length === 0 && !err && (
          <div style={styles.note}>
            {showUnreadOnly ? "No unread notifications." : "No notifications yet."}
          </div>
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
  pageWrap: { maxWidth: 980, margin: "32px auto 0", padding: "0 24px", height: "100%" },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  h1: { fontSize: 22, fontWeight: 700, margin: "8px 0 10px" },
  badge: {
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    fontSize: 12,
    background: "#0ea5e9",
    color: "#fff",
    fontWeight: 700,
  },
  btnGhost: {
    height: 34,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
  },
  btnPrimary: {
    height: 34,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid transparent",
    background: "#0ea5e9",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    cursor: "pointer",
  },
  list: { display: "grid", gap: 14 },
  card: {
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    alignItems: "start",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
  },
  cardRead: {
    opacity: 0.78,
  },
  iconWrap: { display: "flex", alignItems: "center", justifyContent: "center" },
  textWrap: { display: "flex", flexDirection: "column", gap: 6 },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  typePill: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    border: "1px solid #cbd5e1",
    background: "#fff",
    padding: "2px 8px",
    borderRadius: 999,
    color: "#334155",
  },
  time: { color: "#475569", fontSize: 12 },
  msg: {
    margin: 0,
    fontWeight: 600,
    fontSize: 15,
    lineHeight: 1.5,
    color: "#0f172a",
  },
  actionsRow: { marginTop: 6, display: "flex", gap: 8 },
};
