const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/user.model");
const { createUser } = require("../shared/factories/user.factory");

function validateSignup({ name, email, role, password }) {
  if (!name || name.trim().length < 2) throw new Error("Name must be at least 2 characters");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Invalid email");
  if (!["patient", "doctor"].includes(role)) throw new Error("Invalid role");
  if (!password || String(password).length < 6) throw new Error("Password must be ≥ 6 chars");
}

function validateLogin({ email, password }) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Invalid email");
  if (!password || String(password).length < 1) throw new Error("Password required");
}

async function signup({ name, email, role, password }) {
  validateSignup({ name, email, role, password });

  const existing = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (existing) throw new Error("Email already registered");

  const domainUser = createUser({ name: name.trim(), email: email.toLowerCase(), role });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const created = await UserModel.create({
    name: domainUser.name,
    email: domainUser.email,
    role: domainUser.role,
    passwordHash
  });

  const token = jwt.sign(
    { sub: created._id.toString(), role: created.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    user: { id: created._id.toString(), name: created.name, email: created.email, role: created.role },
    token
  };
}

async function login({ email, password }) {
  validateLogin({ email, password });

  const user = await UserModel.findOne({ email: email.toLowerCase() })
    .select("+passwordHash +locked")
    .lean(false);

  if (!user) throw new Error("Invalid credentials");
  if (user.locked) {
    const err = new Error("Account locked");
    err.code = "LOCKED";
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    token
  };
}

module.exports = {
  signup,
  login
};
