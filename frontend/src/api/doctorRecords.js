import api from "../axiosConfig";

export const getRecordByAppointment = (appointmentId) =>
    api.get(`/doctor/records/by-appointment/${appointmentId}`).then(r => r.data);

export const saveMedicalRecord = (payload) =>
    api.post(`/doctor/records`, payload).then(r => r.data);
