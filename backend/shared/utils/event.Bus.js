// backend/shared/utils/event.Bus.js
const EventEmitter = require("events");
const Notification = require("../../models/notification.model");

const bus = new EventEmitter();
console.log("[bus] event bus loaded");

function when(dt) {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    }).format(new Date(dt));
  } catch { return String(dt); }
}

async function createForBoth(appointment, type, messageForPatient, messageForDoctor) {
  const { patientUserId, doctorUserId, _id, start } = appointment;
  const w = when(start);
  const messages = {
    patient: messageForPatient ?? `Your appointment on ${w} was ${type.toLowerCase()}.`,
    doctor:  messageForDoctor  ?? `An appointment on ${w} was ${type.toLowerCase()}.`,
  };
  const docs = [];
  if (patientUserId) {
    docs.push({ recipient: patientUserId, appointment: _id, type, message: messages.patient });
  }
  if (doctorUserId) {
    docs.push({ recipient: doctorUserId, appointment: _id, type, message: messages.doctor });
  }
  if (docs.length) await Notification.insertMany(docs);
}

/** BOOKED */
bus.on("appointment.booked", async ({ appointment }) => {
  try {
    await createForBoth(
      appointment,
      "BOOKED",
      null,
      null
    );
    console.log("[Notification] BOOKED created ✅");
  } catch (err) {
    console.error("Notification creation failed (BOOKED):", err?.message || err);
  }
});

/** RESCHEDULED (updated time) */
bus.on("appointment.rescheduled", async ({ appointment, oldStart }) => {
  try {
    const oldW = when(oldStart);
    const newW = when(appointment.start);
    await createForBoth(
      appointment,
      "RESCHEDULED",
      `Your appointment was rescheduled from ${oldW} to ${newW}.`,
      `Appointment was rescheduled from ${oldW} to ${newW}.`
    );
    console.log("[Notification] RESCHEDULED created ✅");
  } catch (err) {
    console.error("Notification creation failed (RESCHEDULED):", err?.message || err);
  }
});

/** CANCELLED */
bus.on("appointment.canceled", async ({ appointment }) => {
  try {
    await createForBoth(
      appointment,
      "CANCELLED",
      null,
      null
    );
    console.log("[Notification] CANCELLED created ✅");
  } catch (err) {
    console.error("Notification creation failed (CANCELLED):", err?.message || err);
  }
});

module.exports = bus;
