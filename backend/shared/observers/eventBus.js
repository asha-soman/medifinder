const EventEmitter = require("events");
class Bus extends EventEmitter {}
const eventBus = new Bus();
module.exports = { eventBus };
