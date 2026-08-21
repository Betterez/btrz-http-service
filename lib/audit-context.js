function actorUserId(user) {
  if (user == null || user === "") {
    return undefined;
  }
  if (typeof user !== "object") {
    return user;
  }
  return user._id || user.id || user.userId;
}

function accountIdFromRequest(req) {
  if (!req) {
    return undefined;
  }
  const account = req.account || {};
  const user = req.user || {};
  return account.accountId || user.accountId || account._id;
}

function auditContext(req, folder) {
  const accountId = accountIdFromRequest(req);
  const context = {
    accountId,
    userId: actorUserId(req && req.user) || accountId
  };
  if (folder) {
    context.folder = folder;
  }
  return context;
}

module.exports = auditContext;
