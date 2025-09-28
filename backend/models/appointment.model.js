const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({

  patientId: {type: mongoose.Schema.Types.ObjectId,ref: 'Patient', required: true},
  doctorId: {type: mongoose.Schema.Types.ObjectId,ref: 'Doctor', required: true},

  doctorName: { type: String },
  specialty: { type: String },

  start: { type: Date, required: true },
  end: { type: Date, required: true },

  reason: { type: String, trim: true },

  status: {type: String,enum: ['BOOKED', 'COMPLETED', 'CANCELLED'],default: 'BOOKED'}
}, { timestamps: true, collection: 'appointments' });

appointmentSchema.index({ patientId: 1, start: -1 });
appointmentSchema.index({ doctorId: 1, start: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
