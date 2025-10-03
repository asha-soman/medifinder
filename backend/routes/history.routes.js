// backend/routes/history.routes.js
const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { listCompleted } = require("../controllers/history.controller");

const router = express.Router();

// Returns completed appointments for the logged-in user
router.get("/", authenticate, listCompleted);

module.exports = router;
