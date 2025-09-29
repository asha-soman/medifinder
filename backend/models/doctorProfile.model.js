const mongoose = require("mongoose");

const DoctorProfileSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, unique: true, required: true },
    specialization: { type: String, trim: true },
    clinicName:     { type: String, trim: true },
    contact:        { type: String, trim: true }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorProfile", DoctorProfileSchema);
