const Appointment = require("../models/appointment.model");

const listCompleted = async (req, res) => {
  try {
    const u = req.user || {};
    const role = (u.role || u.type || "").toLowerCase();
    const isDoctor = role === "doctor" || u.isDoctor === true || u.doctor === true;

    const filter = { status: "completed" };
    if (isDoctor) filter.doctorId = u._id;
    else filter.patientId = u._id;

    const appts = await Appointment.find(filter)
      .sort({ updatedAt: -1 })
      .populate({ path: "slotId", select: "dayOfWeek startTime endTime" })
      .populate({ path: "patientId", select: "name email" })
      .populate({ path: "doctorId", select: "name email" });

    res.json({ items: appts });   // ✅ wrap result in { items: ... }
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listCompleted };
