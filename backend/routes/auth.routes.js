const express = require("express");
const router = express.Router();
const { signup, login } = require("../services/auth.service");
const { authenticate } = require("../middleware/auth.middleware");  
const { UserModel } = require("../models/user.model"); 

router.post("/register", async (req, res) => {
  try {
    const { user, token } = await signup(req.body);
    return res.status(201).json({ user, token });
  } catch (err) {
    const message = err?.message || "Registration failed";
    const status = /already/i.test(message) ? 409 : 400;
    return res.status(status).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { user, token } = await login(req.body);
    return res.status(200).json({ user, token });
  } catch (err) {
    const msg = err?.message || "Login failed";
    if (err?.code === "LOCKED") return res.status(423).json({ error: "Account locked" });
    const status = /invalid credentials/i.test(msg) ? 401 : 400;
    return res.status(status).json({ error: msg });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
