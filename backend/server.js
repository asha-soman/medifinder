// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

/* ---------------------------
   📌 BODY PARSERS (FIX)
   Use Express built-ins instead of body-parser.
   strict:false lets PATCH/POST with null/empty bodies (e.g., mark-all-read)
---------------------------- */
app.use(express.json({ strict: false }));         // ✅ CHANGED: replaces bodyParser.json(...)
app.use(express.urlencoded({ extended: true }));  // ✅ CHANGED: replaces bodyParser.urlencoded(...)

/* ---------------------------
   Event/listener wiring
---------------------------- */
require('./shared/observers/profile.listeners');

/* ---------------------------
   CORS
---------------------------- */
app.use(cors());

// ⚠️ NOTE: You already called express.json() above with { strict:false }.
// Calling it again is redundant; removing the duplicate to avoid confusion.
// app.use(express.json()); // ❌ (removed; already handled)

/* ---------------------------
   ROUTES
---------------------------- */
app.use('/api/auth', require('./routes/auth.routes'));

// You mounted /api/patient twice previously. Keeping only one mount.
// If you intentionally want it twice, you can add the duplicate back.
app.use('/api/patient', require('./routes/patient.routes')); // ✅ keep

app.use('/api/doctor', require('./routes/doctor.routes'));

// Notifications & History (added in your message)
app.use('/api/notifications', require('./routes/notification.routes')); // ✅ added earlier
app.use('/api/history', require('./routes/history.routes'));            // ✅ added earlier

// Appointments (you chose /api/booking as the base—keep it as-is)
app.use('/api/booking', require('./routes/appointments.routes')); // ✅ this is the appointments router

// Doctor-specific subroutes (schedule, appointments, records)
app.use('/api/doctor', require('./routes/doctor.availability.routes'));
app.use('/api/doctor', require('./routes/doctor.appointments.routes'));
app.use('/api/doctor', require('./routes/doctor.records.routes'));

app.use('/api/test', require('./routes/test.routes'));

/* ---------------------------
   START SERVER
---------------------------- */
if (require.main === module) {
  connectDB();
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
