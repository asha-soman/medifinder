const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const Appointment = require('../models/appointment.model');
const UserModel = require('../models/user.model');

// Helper: build UTC day range
function dayRangeFromUTC(dateIso) {
    const d = new Date(dateIso);
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
    return { start, end };
}

/**
 * GET /api/doctor/appointments?date=YYYY-MM-DD
 * Returns doctor’s appointments for the given day
 */
router.get('/appointments', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const doctorUserId = req.user.sub;
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Missing date query" });

        const { start, end } = dayRangeFromUTC(date);

        const rows = await Appointment.find({
            doctorId: doctorUserId,
            start: { $gte: start, $lte: end }
        })
            .populate('patientId', 'name email')
            .sort({ start: 1 })
            .lean();

        return res.json(rows.map(r => ({
            id: r._id,
            patient: r.patientId,
            start: r.start,
            end: r.end,
            reason: r.reason,
            status: r.status,
        })));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

/**
 * PATCH /api/doctor/appointments/:id/status
 * Body: { status: "BOOKED" | "CANCELLED" | "COMPLETED" }
 */
router.patch('/appointments/:id/status', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['BOOKED', 'CANCELLED', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const appt = await Appointment.findOne({ _id: req.params.id, doctorId: req.user.sub });
        if (!appt) return res.status(404).json({ error: 'Not found' });

        appt.status = status;
        await appt.save();

        return res.json({ id: appt._id, status: appt.status });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
