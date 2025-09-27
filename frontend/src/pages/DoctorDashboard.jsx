import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/client";

export default function DoctorDashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { apiFetch("/doctor/dashboard", { token }).then(setData); }, [token]);
  if (!data) return null;

  return (
    <div style={{ maxWidth: 640, margin: "24px auto" }}>
      <h2>Doctor Dashboard</h2>
      <p>Welcome, Dr. {user?.name}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
