import { apiFetch } from "./client";

export const getDoctorProfile = (token) =>
  apiFetch("/doctor/profile", { token });

export const updateDoctorProfile = (token, patch) =>
  apiFetch("/doctor/profile", { method: "PUT", token, body: patch });
