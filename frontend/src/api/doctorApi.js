import api from "../axiosConfig";

/** Doctor Dashboard */
export const getDoctorAppointments = ({ date, view = "byTime" }) =>
    api.get(`/api/doctor/appointments`, { params: { date, view } }).then(r => r.data);

export const setAppointmentStatus = (id, action) =>
    api.patch(`/api/doctor/appointments/${id}/status`, { action }).then(r => r.data);

export const saveRecords = ({ appointmentId, medicalSummary, prescription }) =>
    api.post(`/api/doctor/records`, { appointmentId, medicalSummary, prescription }).then(r => r.data);

/** Doctor Schedule (Availability) */
export const listAvailability = () =>
    api.get(`/api/doctor/availability`).then(r => r.data);

export const addAvailability = (payload) =>
    api.post(`/api/doctor/availability`, payload).then(r => r.data);

export const updateAvailability = (id, patch) =>
    api.patch(`/api/doctor/availability/${id}`, patch).then(r => r.data);

export const deleteAvailability = (id) =>
    api.delete(`/api/doctor/availability/${id}`).then(r => r.data);
