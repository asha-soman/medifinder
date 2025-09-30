const Doctor = require('../../models/doctor.model');

class DoctorAccessProxy {
    constructor(availabilityService, appointmentService) {
        this.availabilityService = availabilityService;
        this.appointmentService = appointmentService;
    }

    /** Availability: force doctorUserId from JWT (req.user.sub) */
    async listAvailability(req) {
        const doctorUserId = req.user.sub; // NOTE: your /me uses sub
        return this.availabilityService.listByDoctorUserId(doctorUserId);
    }

    async addAvailability(req, payload) {
        const doctorUserId = req.user.sub;
        return this.availabilityService.add(doctorUserId, payload);
    }

    async updateAvailability(req, slotId, patch) {
        // optional: verify the slot belongs to this doctor before update
        // kept lean for now; service-level validation can be added
        return this.availabilityService.update(slotId, patch);
    }

    async removeAvailability(req, slotId) {
        return this.availabilityService.remove(slotId);
    }

    /** Dashboard: verify the appointment belongs to this doctor */
    async ensureOwnsAppointment(req, appt) {
        const doc = await Doctor.findOne({ userId: req.user.sub })  // adapt if your field is different
            || await Doctor.findOne({ user: req.user.sub });          // fallback if schema uses `user`
        if (!doc || String(appt.doctor) !== String(doc._id)) {
            const err = new Error('Not your appointment');
            err.status = 403;
            throw err;
        }
        return doc;
    }
}

module.exports = DoctorAccessProxy;
