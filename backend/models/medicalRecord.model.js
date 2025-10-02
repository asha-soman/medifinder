const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    medicalSummary: { type: String, trim: true },
    prescriptionUrl: { type: String, trim: true },
}, { timestamps: true, collection: 'records' });

medicalRecordSchema.index({ appointmentId: 1 }, { unique: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
