function createError(err) {
  let _error = err;
  if (!err || typeof err.message !== "string" || !err.message.indexOf) {
    _error = new Error(err);
  }
  return _error;
}

function getErrMessages(err) {
  return Array.isArray(err) ? err.map((e) => {
    return e.message;
  }).join(", ") : err.message;
}

const errorTypesStatusCodes = {
  INVALID: 400,
  NOT_FOUND: 404,
};

function getStatusCode(err) {
  if (err.status) {
    return err.status;
  }
  if (err.type) {
    return errorTypesStatusCodes[err.type] || 400;
  }
  return 400;
}

function getStatus(err) {
  const _err = Array.isArray(err) ? createError(err[0]) : createError(err);
  return getStatusCode(_err);
}

function getCode(err) {
  return Array.isArray(err) ? createError(err[0]).code : createError(err).code;
}

function doFatalLog(logger, msg, err) {
  if (logger && logger.fatal) {
    logger.fatal(msg, err);
  }
}

function doErrorLog(logger, msg, err) {
  if (logger && logger.error) {
    logger.error(msg, err);
  }
}

function _isCustomError(err) {
  return err.type && err.code;
}

function _isValidationError(err) {
  return err && (err.name === "ValidationError" || _isCustomError(err));
}

function isValidationError(err) {
  let isValidationErrors = false;
  if (Array.isArray(err)) {
    isValidationErrors = err.every((e) => {
      return _isValidationError(e);
    });
  }
  return _isValidationError(err) || isValidationErrors;
}

function validationFailed(res, logger) {
  return function _internal(err) {
    const message = getErrMessages(err);
    const status = getStatus(err);
    const code = getCode(err);
    doErrorLog(logger, "Validation Failed ON http-response-handlers", {
      status,
      code,
      message
    });
    return res.status(status).json({
      code,
      message
    });
  };
}

function _isMongoDbConflict(err) {
  if (err && err.message) {
    const duplicateKeyError = (
      err.message.indexOf("E11000 duplicate key error index") > -1 ||
      err.message.indexOf("E11000 duplicate key error collection") > -1
    );
    if (duplicateKeyError) {
      return true;
    }
  }
  return false;
}

function error(res, logger) {
  return function _internal(err) {
    if (isValidationError(err)) {
      return validationFailed(res, logger)(err);
    } else if (_isMongoDbConflict(err)) {
      doErrorLog(logger, "MONGO CONFLICT ON http-response-handlers.error", err);
      const e = createError(err);
      return res.status(409).json({code: e.message});
    }

    doFatalLog(logger, "ERROR ON http-response-handlers.error", err);

    const e = createError(err);
    const code = e.code || e.message;
    const message = e.message;
    const status = err && err.status && !isNaN(err.status) ? err.status : 500;
    return res.status(status).json({code, message});
  };
}

function success(res, code) {
  return function _internal(data) {
    let status = 200;
    if (code > 200 && code <= 208) {
      status = code;
    }
    return res.status(status).json(data);
  };
}

exports.error = error;
exports.success = success;
exports.createError = createError;
exports._isMongoDbConflict = _isMongoDbConflict;
