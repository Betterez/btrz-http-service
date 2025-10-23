const jwt = require("jsonwebtoken");

function base64UrlEncode(data) {
  return encodeURIComponent(Buffer.from(JSON.stringify(data)).toString('base64'));
}

function hasInvalidToken(token, privateKey, action) {
  try {
    const decodedToken =  jwt.verify(token, privateKey);
    return !decodedToken ||
      !decodedToken.action ||
      decodedToken.action.name !== action.name ||
      JSON.stringify(decodedToken.action.data) !== JSON.stringify(action.data);
  } catch (error) {
    return true;
  }
}

function redirectToElevatePermissions(req, res, privateKey, action, delegate) {
  if (typeof delegate === "function") {
    if (delegate.apply() && (hasInvalidToken(req.session.elevationToken, privateKey, action))) {
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

function getElevationToken(user, privateKey, action) {
  return jwt.sign({user, action}, privateKey, {expiresIn: "30m" });
}

function markElevationTokenAsUsed(req, privateKey, action) {
  const elevationToken = req.session.elevationToken;
  if (hasInvalidToken(elevationToken, privateKey, action)) {
    return false;
  }
  if (elevationToken) {
    req.session.elevationToken = null;
  }
}

function elevationTokenMiddleware(logger) {
  return function _elevationTokenMiddleware(req, res, next) {
    const elevationToken = req.headers["x-elevation-token"];
    const privateKey = req.application?.privateKey;

    req.elevationToken = null;

    if (!elevationToken) {
      return next();
    }

    if (!privateKey) {
      logger.error("Received an 'x-elevation-token', but it cannot be verified because there is no private key associated with the current request.  The token will be ignored.");
      return next();
    }

    let decodedToken;

    try {
      decodedToken = jwt.verify(elevationToken, privateKey);
    } catch (error) {
      logger.error("Invalid token received in 'x-elevation-token' header", error);
      return next();
    }

    const idOfUserPerformingRequest = req.user?._id;
    const idOfUserGivenElevationToken = decodedToken.user?._id;

    if (!idOfUserPerformingRequest) {
      logger.error("Received an 'x-elevation-token', but there is no user associated with the current request.  The token will be ignored.");
      return next();
    }

    if (!idOfUserGivenElevationToken) {
      logger.error("Received a malformed 'x-elevation-token'.  The token does not contain a user ID.   The token will be ignored.");
      return next();
    }

    if (idOfUserPerformingRequest !== idOfUserGivenElevationToken) {
      logger.error("Received an 'x-elevation-token' which belongs to another user.  The token will be ignored.");
      return next();
    }

    req.elevationToken = decodedToken;
    return next();
  }
}

module.exports = {
  markElevationTokenAsUsed,
  redirectToElevatePermissions,
  base64UrlEncode,
  getElevationToken,
  elevationTokenMiddleware
};

