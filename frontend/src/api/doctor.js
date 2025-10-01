import { apiFetch } from "./client";

export const getDoctorProfile = (token) =>
  apiFetch("/doctor/profile", { token });

export const updateDoctorProfile = (token, patch) =>
  apiFetch("/doctor/profile", { method: "PUT", token, body: patch });

export const fetchAvailability = (dateISO, token) =>
  apiFetch(`/doctor/availability?date=${encodeURIComponent(dateISO)}`, { token });

export const createAvailability = (payload, token) =>
  apiFetch("/doctor/availability", { method: "POST", body: payload, token });

export const updateAvailability = (id, patch, token) =>
  apiFetch(`/doctor/availability/${id}`, { method: "PATCH", body: patch, token });

export const deleteAvailability = (id, token) =>
  apiFetch(`/doctor/availability/${id}`, { method: "DELETE", token });

