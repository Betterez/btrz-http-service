const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret";

function base64UrlEncode(data) {
  return encodeURIComponent(Buffer.from(JSON.stringify(data)).toString('base64'));
}

function hasInvalidToken(token, action) {
  const decodedToken = jwt.decode(token);
  return !decodedToken || 
    !decodedToken.action ||
    decodedToken.action.name !== action.name || 
    JSON.stringify(decodedToken.action.data) !== JSON.stringify(action.data);
}

function redirectToElevatePermissions(req, res, action, delegate) {
  if (typeof delegate === "function") {
    if (delegate.apply() && (hasInvalidToken(req.session.elevationToken, action))) {
      if (action && action.redirectUrl) {
        return res.redirect(`${action.redirectUrl}?action=${base64UrlEncode(action)}`);
      } else {
        return true;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function getElevationToken(user, action) {
  return jwt.sign({user, action}, JWT_SECRET, {expiresIn: "30m" });
}

function markElevationTokenAsUsed(req, action) {
  const elevationToken = req.session.elevationToken;
  if (hasInvalidToken(elevationToken, action)) {
    return false;
  }
  if (elevationToken) {
    req.session.elevationToken = null;
  }
}

module.exports = {
  markElevationTokenAsUsed,
  redirectToElevatePermissions,
  base64UrlEncode,
  getElevationToken,
  JWT_SECRET
};

