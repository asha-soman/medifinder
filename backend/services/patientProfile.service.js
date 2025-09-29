const PatientProfile = require("../models/patientProfile.model");
const { eventBus } = require("../shared/observers/eventBus");
const { withAudit } = require("../shared/decorators/audit.decorator");

class PatientProfileService {
  async getByUserId(userId) {
    let doc = await PatientProfile.findOne({ userId });
    if (!doc) doc = await PatientProfile.create({ userId });
    return doc;
  }

  /**
   * Internal raw update for audit decorator.
   */
  async _updateRaw(userId, patch) {
    const allowed = {};
    if (patch?.dateOfBirth) allowed.dateOfBirth = patch.dateOfBirth;
    if (typeof patch?.phone === "string") allowed.phone = patch.phone.trim();
    if (typeof patch?.address === "string") allowed.address = patch.address.trim();
    if (typeof patch?.emergencyContact === "string") allowed.emergencyContact = patch.emergencyContact.trim();

    const before = (await PatientProfile.findOne({ userId }))?.toObject() || {};
    const result = await PatientProfile.findOneAndUpdate(
      { userId },
      { $set: allowed },
      { new: true, upsert: true }
    );

    eventBus.emit("profile.updated", {
      userId,
      role: "patient",
      changes: Object.keys(allowed),
    });

    return {
      actorId: userId,
      before,
      result,
      meta: { changedFields: Object.keys(allowed) },
    };
  }
}

const service = new PatientProfileService();
withAudit("PatientProfile", "_updateRaw", service, "update");
service.update = service._updateRaw.bind(service);

module.exports = { PatientProfileService: service };
