import api from "../axiosConfig";

export const getSpecialties = () =>
  api.get("/api/booking/specialties").then((r) => r.data);

export const searchDoctors = (params) => {
  const q = { ...params };
  if (q.specialty !== undefined) {
    q.specialization = q.specialty;
    delete q.specialty;
  }
  return api.get("/api/booking/search", { params: q }).then((r) => r.data);
};

export const bookAppointment = (data) =>
  api.post("/api/booking/book", data).then((r) => r.data);

export const getMyAppointments = () =>
  api.get("/api/booking/my").then((r) => r.data);

// will check later for changes, if we still have a patient-by-id endpoint, keep it;
// otherwise, delete this later.
export const getPatient = (id) =>
  api.get(`/api/patient/${id}`).then((r) => r.data);

export const getMe = () =>
  api.get("/api/users/me").then((r) => r.data);

export const cancelAppointmentApi = (id) =>
  api.patch(`/api/booking/appointments/${id}/cancel`).then((r) => r.data);

export const editAppointment = (id, payload) =>
  api.patch(`/api/booking/appointments/${id}`, payload).then((r) => r.data);
