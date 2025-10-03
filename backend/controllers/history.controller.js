// backend/controllers/history.controller.js
const Appointment = require("../models/appointment.model");
const { UserModel: User } = require("../models/user.model");
const DoctorProfile = require("../models/doctorProfile.model");

// Helper to safely pull the current user's id/role from many possible JWT shapes
function getUserFromReq(req) {
  const u = req.user || {};
  const userId =
    u._id ||
    u.id ||
    u.userId ||
    u.sub ||
    (u.user && (u.user._id || u.user.id || u.user.userId));

  const role =
    (u.role || u.type) ||
    (u.user && (u.user.role || u.user.type)) ||
    ""; // patient|doctor expected

  return { userId: userId ? String(userId) : "", role: String(role).toLowerCase() };
}

// GET /api/history
// Returns COMPLETED appointments for the logged-in user.
// - Patients: completed visits with doctor info
// - Doctors:  completed visits with patient info
const listCompleted = async (req, res) => {
  try {
    const { userId, role } = getUserFromReq(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const isDoctor = role === "doctor";

    // Match your Appointment schema (uppercase statuses + correct fields)
    const filter = { status: "COMPLETED" };
    if (isDoctor) filter.doctorUserId = userId;
    else filter.patientUserId = userId;

    const appts = await Appointment.find(filter).sort({ updatedAt: -1 }).lean();
    if (appts.length === 0) return res.json({ items: [] });

    // Gather related users
    const ids = [
      ...new Set(appts.flatMap(a => [String(a.patientUserId), String(a.doctorUserId)])),
    ];

    const usersById = await User.find({ _id: { $in: ids } })
      .select("_id name email role")
      .lean()
      .then(list => Object.fromEntries(list.map(u => [String(u._id), u])));

    // Doctor profiles (some schemas use 'user', others 'userId')
    const doctorUserIds = [...new Set(appts.map(a => String(a.doctorUserId)))];
    const profiles = await DoctorProfile.find({
      $or: [{ user: { $in: doctorUserIds } }, { userId: { $in: doctorUserIds } }],
    })
      .select("user userId specialization contact")
      .lean();

    const profByUser = {};
    for (const p of profiles) {
      const key = String(p.user || p.userId);
      profByUser[key] = p;
    }

    const items = appts.map(a => {
      const p = usersById[String(a.patientUserId)] || {};
      const d = usersById[String(a.doctorUserId)] || {};
      const prof = profByUser[String(a.doctorUserId)] || {};

      return {
        _id: a._id,
        start: a.start,
        end: a.end,
        status: a.status, // "COMPLETED"
        patient: { _id: a.patientUserId, name: p.name || "", email: p.email || "" },
        doctor: {
          _id: a.doctorUserId,
          name: d.name || "",
          email: d.email || "",
          specialization: prof.specialization || "",
          contact: prof.contact || "",
        },
      };
    });

    return res.json({ items });
  } catch (err) {
    console.error("History fetch error:", err);
    return res.status(500).json({ message: err.message || "History lookup failed" });
  }
};

module.exports = { listCompleted };
