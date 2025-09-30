const Availability = require('../models/availability.model');

class AvailabilityService {
    async listByDoctorUserId(doctorUserId) {
        return Availability.find({ doctorUserId }).sort({ date: 1, startTime: 1 });
    }
    async add(doctorUserId, payload) {
        return Availability.create({ doctorUserId, ...payload, isBlocked: !!payload.isBlocked });
    }
    async update(slotId, patch) {
        return Availability.findByIdAndUpdate(slotId, patch, { new: true });
    }
    async remove(slotId) {
        return Availability.findByIdAndDelete(slotId);
    }
}
module.exports = new AvailabilityService();
