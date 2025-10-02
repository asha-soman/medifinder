// src/api/bookingApi.js
import api from "../axiosConfig";

const API_ROOT =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) || "http://localhost:5001/api";

const withBase = (extra = {}) => ({ baseURL: API_ROOT, ...extra });

const withAuth = (extra = {}) => {
  const t = localStorage.getItem("jwt"); // must match your login storage key
  return withBase({
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    ...extra,
  });
};

//utilities
const toISO = (v) => {
  if (!v) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d.toISOString();
};

// Specialties 
export const getSpecialties = () =>
  api.get("/booking/specialties", withBase()).then((r) => r.data);

// Search doctors
export const searchDoctors = (params = {}) => {
  const q = { ...params };
  if ("specialty" in q) {
    q.specialization = q.specialty;
    delete q.specialty;
  }
  return api.get("/booking/search", withBase({ params: q })).then((r) => r.data);
};

//auth ausers

export const getMe = () =>
  api.get("/users/me", withAuth()).then((r) => r.data);

export const getPatient = (id) =>
  api.get(`/patient/${id}`, withAuth()).then((r) => r.data);

// Book appointment
// Accepts: { doctorUserId | doctorId, start | slotISO, reason?, patientUserId? }
export const bookAppointment = async (data = {}) => {
  const body = { ...data };

  if (!body.doctorUserId && body.doctorId) body.doctorUserId = body.doctorId;
  if (!body.start && body.slotISO) body.start = body.slotISO;
  if (body.start) body.start = toISO(body.start);

  const res = await api.post("/booking/book", body, withAuth());
  return res.data;
};

// Get my appointments-backend wants patientUserId; pass via query if provided
export const getMyAppointments = (patientUserId) =>
  api
    .get(
      "/booking/my",
      withAuth({ params: patientUserId ? { patientUserId } : {} })
    )
    .then((r) => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.items)) return d.items;
      if (Array.isArray(d?.appointments)) return d.appointments;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    });


// Edit appointment (pass patientUserId via query if provided)
export const editAppointment = (id, payload = {}, patientUserId) => {
  const body = { ...payload };
  if (!body.start && body.slotISO) body.start = body.slotISO;
  if (body.start) body.start = toISO(body.start);

  return api
    .patch(
      `/booking/appointments/${id}`,
      body,
      withAuth({ params: patientUserId ? { patientUserId } : {} })
    )
    .then((r) => r.data);
};

// Cancel appointment (soft-cancel) — tries multiple patterns
export const cancelAppointmentApi = async (id, patientUserId) => {
  const q = patientUserId ? { patientUserId } : {};

  // A) action-style endpoint with query parama
  try {
    const r = await api.patch(
      `/booking/appointments/${id}/cancel`,
      null,
      withAuth({ params: q })
    );
    return r.data;
  } catch (e1) {
    const code1 = e1?.response?.status;
    const msg1 = e1?.response?.data?.error || "";

    // B) same endpoint but patientUserId in the body
    if ((code1 === 400 || /patientUserId/i.test(msg1)) && patientUserId) {
      try {
        const r = await api.patch(
          `/booking/appointments/${id}/cancel`,
          { patientUserId },
          withAuth()
        );
        return r.data;
      } catch (e2) {
        // fall through to C
      }
    }

    // C) status update endpoint (soft delete), try both spellings
    try {
      const r = await api.patch(
        `/booking/appointments/${id}`,
        { status: "cancelled", ...(patientUserId ? { patientUserId } : {}) },
        withAuth()
      );
      return r.data;
    } catch (e3) {
      try {
        const r = await api.patch(
          `/booking/appointments/${id}`,
          { status: "canceled", ...(patientUserId ? { patientUserId } : {}) },
          withAuth()
        );
        return r.data;
      } catch (e4) {
        // D) for the error
        const err = e4?.response?.data?.error || e3?.response?.data?.error || msg1 || e1.message || "Cancel failed.";
        const status = e4?.response?.status || e3?.response?.status || code1;
        const wrapped = new Error(`${status || ""} ${err}`.trim());
        wrapped.response = e4?.response || e3?.response || e1?.response;
        throw wrapped;
      }
    }
  }
};
