const mongoose = require("mongoose");

const PatientProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, unique: true, required: true },
    dateOfBirth: { type: Date },
    contact: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PatientProfile", PatientProfileSchema);
