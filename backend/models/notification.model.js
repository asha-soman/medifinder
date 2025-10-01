// backend/models/notification.model.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // IMPORTANT: this should be the **User** _id (not Patient/Doctor _id)
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    message: { type: String, required: true },

    // keep the values exactly like this (we'll use them from the controller)
    type: { type: String, enum: ["BOOKED", "CANCELLED", "RESCHEDULED"], required: true },

    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
