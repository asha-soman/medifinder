// revised this to align with availability
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    start:  { type: Date, required: true, index: true },
    end:    { type: Date, required: true },

    reason: { type: String, trim: true },

    status: {
      type: String,
      enum: ['BOOKED', 'COMPLETED', 'CANCELLED'],
      default: 'BOOKED',
      index: true
    }
  },
  { timestamps: true, collection: 'appointments' }
);

appointmentSchema.index({ patientUserId: 1, start: -1 });
appointmentSchema.index(
  { doctorUserId: 1, start: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['BOOKED', 'COMPLETED'] } } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
