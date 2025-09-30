const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
            index: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
            index: true
        },
        prescription: {
            type: String,
            required: false
            // will store file path or URL (e.g., AWS S3, local /uploads, etc.)
        },
        medicalSummary: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Record", recordSchema);
