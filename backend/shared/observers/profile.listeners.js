const { eventBus } = require("./eventBus");

eventBus.on("profile.updated", (payload) => {
  console.log("[Observer] profile.updated", payload);
});
