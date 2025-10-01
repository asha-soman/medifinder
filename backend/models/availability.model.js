const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
    {
        doctorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true, collection: "availability" }
);

module.exports = mongoose.model("Availability", availabilitySchema);
