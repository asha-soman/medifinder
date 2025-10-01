const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

require('./shared/observers/profile.listeners');

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/patient', require('./routes/patient.routes'));
app.use('/api/doctor', require('./routes/doctor.routes'));
app.use('/api/patient', require('./routes/patient.routes'));
app.use('/api/notifications', require('./routes/notification.routes')); //--added
app.use('/api/history', require('./routes/history.routes')); //--added
app.use('/api/doctor', require('./routes/doctor.availability.routes'));
app.use('/api/doctor', require('./routes/doctor.appointments.routes'));
app.use('/api/doctor', require('./routes/doctor.records.routes'));


app.use('/api/test', require('./routes/test.routes'));

if (require.main === module) {
  connectDB();
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
