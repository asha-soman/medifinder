const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actorId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action:   { type: String, required: true },              
    entity:   { type: String, required: true },          
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    before:   { type: Object },
    after:    { type: Object },
    meta:     { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);
