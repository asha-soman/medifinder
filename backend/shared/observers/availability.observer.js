const EventEmitter = require('events');

class AvailabilityObserver extends EventEmitter { }
const availabilityObserver = new AvailabilityObserver();

// Example subscriber (optional; keep or remove)
availabilityObserver.on('availability.changed', (e) => {
    console.log('[availability.changed]', e);
});

module.exports = { availabilityObserver };
