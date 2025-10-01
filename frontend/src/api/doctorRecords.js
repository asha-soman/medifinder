import api from "../axiosConfig";

export const getRecordByAppointment = (appointmentId) =>
    api.get(`/api/doctor/records/by-appointment/${appointmentId}`).then(r => r.data);

export const saveMedicalRecord = (payload) =>
    api.post(`/api/doctor/records`, payload).then(r => r.data);
