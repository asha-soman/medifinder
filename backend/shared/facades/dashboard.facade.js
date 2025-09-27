// backend/shared/facades/dashboard.facade.js
// Facade: central place to build role-specific dashboard data.
// We'll wire real counts once availability/appointments exist.

async function getDoctorDashboard(userId) {
  // TODO: replace placeholders with real queries later
  return {
    role: "doctor",
    widgets: [
      { key: "todayAppointments", label: "Today’s Appointments", value: 0 },
      { key: "weekAppointments", label: "This Week", value: 0 },
      { key: "openSlots",        label: "Open Slots", value: 0 }
    ],
    quickLinks: [
      { label: "Manage Availability", path: "/doctor/availability" },
      { label: "View Schedule",       path: "/doctor/schedule" }
    ],
    userId
  };
}

async function getPatientDashboard(userId) {
  return {
    role: "patient",
    widgets: [
      { key: "nextAppointment", label: "Next Appointment", value: null },
      { key: "upcomingCount",   label: "Upcoming",         value: 0 },
      { key: "doctorsCount",    label: "My Doctors",       value: 0 }
    ],
    quickLinks: [
      { label: "Book Appointment", path: "/patient/book" },
      { label: "My Records",       path: "/patient/records" }
    ],
    userId
  };
}

module.exports = { getDoctorDashboard, getPatientDashboard };
