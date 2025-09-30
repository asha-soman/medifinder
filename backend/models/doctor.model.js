// backend/models/doctor.model.js  (CJS)
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
    {
        role: { type: String, enum: ['DOCTOR'], default: 'DOCTOR', index: true },
        doctorName: { type: String, required: true, trim: true },
        specialization: { type: String, required: true, trim: true, index: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone: { type: String, trim: true },
    },
    { timestamps: true, collection: 'doctors' }
);

doctorSchema.index({ doctorName: 'text', specialization: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);

