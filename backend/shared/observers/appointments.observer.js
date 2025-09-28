const EventEmitter = require('events');

class AppointmentObserver extends EventEmitter {}
const appointmentObserver = new AppointmentObserver();

// keep as logs; doesn’t change behavior
appointmentObserver.on('appointment.booked', p => {
  console.log('[event] appointment.booked', p);
});
appointmentObserver.on('appointment.updated', p => {
  console.log('[event] appointment.updated', p);
});
appointmentObserver.on('appointment.canceled', p => {
  console.log('[event] appointment.canceled', p);
});

module.exports = { appointmentObserver };
