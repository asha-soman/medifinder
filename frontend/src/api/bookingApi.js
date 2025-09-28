import api from "../axiosConfig";

export const getSpecialties = () =>
  api.get("/api/booking/specialties").then((r) => r.data);

export const searchDoctors = (params) =>
  api.get("/api/booking/search", { params }).then((r) => r.data);

export const bookAppointment = (data) =>
  api.post("/api/booking/book", data).then((r) => r.data);

export const getMyAppointments = (patientId) =>
  api.get("/api/booking/my", { params: { patientId } }).then((r) => r.data);

export const getPatient = (id) =>
  api.get(`/api/patient/${id}`).then((r) => r.data);

export const cancelAppointmentApi = (id) =>
  api.patch(`/api/booking/appointments/${id}/cancel`).then((r) => r.data);

export const editAppointment = (id, payload) =>
  api.patch(`/api/booking/appointments/${id}`, payload).then((r) => r.data);