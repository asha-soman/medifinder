const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
    {
        doctorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        date: {
            type: Date,
            required: true,
            index: true
        },
        startTime: {
            type: String,
            required: true
        }, // store as "HH:mm" string or ISO string fragment
        endTime: {
            type: String,
            required: true
        },
        isBlocked: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Prevent duplicate slots for same doctor/date/time
availabilitySchema.index(
    { doctorUserId: 1, date: 1, startTime: 1, endTime: 1 },
    { unique: true }
);

module.exports = mongoose.model("Availability", availabilitySchema);
