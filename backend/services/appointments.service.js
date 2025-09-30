const Appointment = require('../models/appointment.model');

class AppointmentService {
    async listForDoctorByDay(doctorId, dayStart, dayEnd) {
        return Appointment.find({
            doctor: doctorId,
            startTime: { $gte: dayStart, $lte: dayEnd }
        })
            .populate({ path: 'patient', populate: { path: 'user' } })
            .sort({ startTime: 1 });
    }

    async findById(id) {
        return Appointment.findById(id);
    }

    async setStatus(id, status) {
        return Appointment.findByIdAndUpdate(id, { status }, { new: true });
    }
}
module.exports = new AppointmentService();
