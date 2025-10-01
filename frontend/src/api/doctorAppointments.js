import api from "../axiosConfig";

// GET doctor appointments for a date
export const getDoctorAppointments = (date) =>
    api.get("/api/doctor/appointments", { params: { date } }).then(r => r.data);

// PATCH status
export const updateAppointmentStatus = (id, status) =>
    api.patch(`/api/doctor/appointments/${id}/status`, { status }).then(r => r.data);
