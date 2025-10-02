import api from "../axiosConfig";

// GET doctor appointments for a date
export const getDoctorAppointments = (date) =>
    api.get("/doctor/appointments", { params: { date } }).then(r => r.data);

// PATCH status
export const updateAppointmentStatus = (id, status) =>
    api.patch(`/doctor/appointments/${id}/status`, { status }).then(r => r.data);
