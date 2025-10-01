// backend/observers/notificationObserver.js
const bus = require("../utils/eventBus");
const Notification = require("../models/notification.model");

function buildMsg(type, appt) {
  if (type === "booking")      return `New booking by ${appt?.patientId?.name || "patient"}.`;
  if (type === "cancellation") return `Appointment was cancelled.`;
  if (type === "reschedule")   return `Appointment was updated/rescheduled.`;
  return "Notification";
}

async function createForDoctor(type, appt) {
  await Notification.create({
    recipient: appt.doctorId,
    type,
    appointment: appt._id,
    message: buildMsg(type, appt),
  });
}

async function createForPatient(type, appt) {
  await Notification.create({
    recipient: appt.patientId,
    type,
    appointment: appt._id,
    message: buildMsg(type, appt),
  });
}

// Subscribe to domain events (Observer)
bus.on("appointment:booked", async (appt) => {
  // doctor gets "booking" alert
  try { await createForDoctor("booking", appt); } catch (e) { console.error(e); }
});

bus.on("appointment:cancelled", async (appt) => {
  // patient + doctor get "cancellation"
  try { await createForDoctor("cancellation", appt); } catch (e) { console.error(e); }
  try { await createForPatient("cancellation", appt); } catch (e) { console.error(e); }
});

bus.on("appointment:updated", async (appt) => {
  // patient + doctor get "reschedule" alert
  try { await createForDoctor("reschedule", appt); } catch (e) { console.error(e); }
  try { await createForPatient("reschedule", appt); } catch (e) { console.error(e); }
});

module.exports = {}; // just executing subscriptions on import
