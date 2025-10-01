const AuditLog = require("../../models/auditLog.model");

function withAudit(entityName, fnName, serviceInstance, actionName = "update") {
  const original = serviceInstance[fnName];
  if (typeof original !== "function") throw new Error(`fn ${fnName} not found on ${entityName}`);

  serviceInstance[fnName] = async function wrapped(...args) {
    const { actorId, before, result, meta } = await original.apply(this, args);

    await AuditLog.create({
      actorId,
      action: `${entityName}.${actionName}`,
      entity: entityName,
      entityId: result?._id,
      before,
      after: result,
      meta,
    });

    return result; 
  };

  return serviceInstance;
}

module.exports = { withAudit };
