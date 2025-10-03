const EventEmitter = require('events');

class AvailabilityObserver extends EventEmitter { }
const availabilityObserver = new AvailabilityObserver();

availabilityObserver.on('availability.changed', (e) => {
    console.log('[availability.changed]', e);
});

module.exports = { availabilityObserver };
