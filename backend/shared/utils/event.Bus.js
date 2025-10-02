const EventEmitter = require("events");
const Notification = require("../../models/notification.model");
const Patient = require("../../models/patientProfile.model");
const Doctor = require("../../models/doctorProfile.model");

const bus = new EventEmitter();
console.log("[bus] event bus loaded");

// helpers: return the **User** _id, not Patient/Doctor _id
async function userIdFromPatient(patientId) {
  if (!patientId) return null;
  const p = await Patient.findById(patientId).select("user userId").lean();
  return p?.user || p?.userId || null;
}
async function userIdAndNameFromDoctor(doctorId) {
  if (!doctorId) return { userId: null, doctorName: "" };
  const d = await Doctor.findById(doctorId).select("user userId doctorName").lean();
  return { userId: d?.user || d?.userId || null, doctorName: d?.doctorName || "" };
}

// BOOKED
bus.on("appointment.booked", async ({ appointment }) => {
  try {
    const patientUserId = await userIdFromPatient(appointment.patientId);
    const { userId: doctorUserId, doctorName } = await userIdAndNameFromDoctor(appointment.doctorId);

    const when = appointment.start
      ? new Date(appointment.start).toLocaleString()
      : "the scheduled time";

    if (patientUserId) {
      await Notification.create({
        recipient:   patientUserId,      // <-- USER _id
        appointment: appointment._id,
        type:        "BOOKED",
        message:     `Your booking with Dr ${doctorName} is confirmed on ${when}.`,
      });
    }
    if (doctorUserId) {
      await Notification.create({
        recipient:   doctorUserId,       // <-- USER _id
        appointment: appointment._id,
        type:        "BOOKED",
        message:     `New appointment booked for ${when}.`,
      });
    }
    console.log("[Notification] BOOKED created ✅");
  } catch (err) {
    console.error("Notification creation failed (BOOKED):", err?.message || err);
  }
});

// CANCELLED
bus.on("appointment.canceled", async ({ appointment }) => {
  try {
    const patientUserId = await userIdFromPatient(appointment.patientId);
    const { userId: doctorUserId, doctorName } = await userIdAndNameFromDoctor(appointment.doctorId);

    const when = appointment.start
      ? new Date(appointment.start).toLocaleString()
      : "the scheduled time";

    if (patientUserId) {
      await Notification.create({
        recipient:   patientUserId,      // <-- USER _id
        appointment: appointment._id,
        type:        "CANCELLED",
        message:     `Your appointment with Dr ${doctorName} on ${when} was cancelled.`,
      });
    }
    if (doctorUserId) {
      await Notification.create({
        recipient:   doctorUserId,       // <-- USER _id
        appointment: appointment._id,
        type:        "CANCELLED",
        message:     `An appointment scheduled for ${when} was cancelled.`,
      });
    }
    console.log("[Notification] CANCELLED created ✅");
  } catch (err) {
    console.error("Notification creation failed (CANCELLED):", err?.message || err);
  }
});

module.exports = bus;
