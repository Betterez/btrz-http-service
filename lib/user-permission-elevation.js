const jwt = require("jsonwebtoken");
const hash = require("object-hash");

function base64UrlEncode(data) {
  return encodeURIComponent(Buffer.from(JSON.stringify(data)).toString('base64'));
}

function objectsAreEqual(obj1, obj2) {
  if (obj1 === undefined && obj2 === undefined) {
    return true;
  } else if (obj1 === null && obj2 === null) {
    return true;
  } else if (Boolean(obj1) !== Boolean(obj2)) {
    return false;
  }

  const hashOptions = {algorithm: "passthrough", unorderedArrays: true};
  return hash(obj1, hashOptions) === hash(obj2, hashOptions);
}

function hasInvalidToken(token, privateKey, action) {
  try {
    const decodedToken =  jwt.verify(token, privateKey);
    return !decodedToken ||
      !decodedToken.action ||
      decodedToken.action.name !== action.name ||
      !objectsAreEqual(decodedToken.action.data, action.data);
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

