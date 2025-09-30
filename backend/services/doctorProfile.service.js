const DoctorProfile = require("../models/doctorProfile.model");
const { eventBus } = require("../shared/observers/eventBus");
const { withAudit } = require("../shared/decorators/audit.decorator");

class DoctorProfileService {
  async getByUserId(userId) {
    // ensure profile exists
    let doc = await DoctorProfile.findOne({ userId });
    if (!doc) doc = await DoctorProfile.create({ userId });
    return doc;
  }

  async _updateRaw(userId, patch) {
    const allowed = {};
    if (typeof patch?.specialization === "string") allowed.specialization = patch.specialization.trim();
    if (typeof patch?.contact === "string")        allowed.contact        = patch.contact.trim();

    const before = (await DoctorProfile.findOne({ userId }))?.toObject() || {};
    const result = await DoctorProfile.findOneAndUpdate(
      { userId },
      { $set: allowed },
      { new: true, upsert: true }
    );

     eventBus.emit("profile.updated", {
      userId,
      role: "doctor",
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

const service = new DoctorProfileService();
withAudit("DoctorProfile", "_updateRaw", service, "update");
service.update = service._updateRaw.bind(service);

module.exports = { DoctorProfileService: service };
