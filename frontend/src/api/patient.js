// src/api/patient.js
import { apiFetch } from "./client";

export async function getPatientDashboard(token) {
  return apiFetch("/patient/dashboard", { token });
}

// NEW: Patient profile GET/PUT
export async function getPatientProfile(token) {
  return apiFetch("/patient/profile", { token });
}

export async function updatePatientProfile(token, payload) {
  return apiFetch("/patient/profile", { method: "PUT", body: payload, token });
}
