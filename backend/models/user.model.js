const mongoose = require("mongoose");
const ROLES = ["patient", "doctor"];

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
  },
  role: { type: String, enum: ROLES, required: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  locked: { type: Boolean, default: false },
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true });
const UserModel = mongoose.model("User", UserSchema);
module.exports = { UserModel, ROLES };
