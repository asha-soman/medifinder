const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { listCompleted } = require("../controllers/history.controller");

const router = express.Router();

// use listCompleted, not getHistory or something else
router.get("/", authenticate, listCompleted);

module.exports = router;
