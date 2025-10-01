const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    medicalSummary: { type: String, trim: true },
    prescriptionUrl: { type: String, trim: true },  // keep it simple for now (no upload service yet)
}, { timestamps: true, collection: 'medical_records' });

medicalRecordSchema.index({ appointmentId: 1 }, { unique: true }); // one record per appointment

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
