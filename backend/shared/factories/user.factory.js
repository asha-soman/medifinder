// backend/shared/factories/user.factory.js
class BaseUser { constructor({ name, email, role }) { this.name = name; this.email = email; this.role = role; } }
class PatientUser extends BaseUser {}
class DoctorUser extends BaseUser {}

function createUser({ name, email, role }) {
  if (role === "patient") return new PatientUser({ name, email, role });
  if (role === "doctor")  return new DoctorUser({ name, email, role });
  throw new Error("Invalid role");
}

module.exports = { createUser, PatientUser, DoctorUser };
