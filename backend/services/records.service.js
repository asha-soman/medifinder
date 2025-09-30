const Record = require('../models/medicalRecord.model');

class RecordService {
    async upsertByAppointment(appt, { medicalSummary, prescription }) {
        const payload = {
            appointment: appt._id,
            patient: appt.patient,
            doctor: appt.doctor,
            medicalSummary,
            prescription
        };
        const existing = await Record.findOne({ appointment: appt._id });
        return existing
            ? Record.findByIdAndUpdate(existing._id, payload, { new: true })
            : Record.create(payload);
    }
}
module.exports = new RecordService();
