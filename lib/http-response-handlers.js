"use strict";

let ValidationError = require("./validation-error");

function createError(err) {
  let error = err;
  if (!err || typeof(err.message) !== "string" || !err.message.indexOf) {
    error = new Error(err);
  }
  return error;
}

function getErrMessages(err) {
  return Array.isArray(err) ? err.map((e) => { return e.message;}).join(", ") : err.message;
}

function getStatus(err) {
  return Array.isArray(err) ? createError(err[0]).status : createError(err).status;
}

function getCode(err) {
  return Array.isArray(err) ? createError(err[0]).code : createError(err).code;
}

function doLog(logger, msg, err) {
  if (logger && logger.error) {
    logger.error(msg, err);
  }
}

function isValidationError (err) {
  let isValidationErrors = false;
  if (Array.isArray(err)) {
    isValidationErrors = err.every(e => e instanceof ValidationError);
  }
  return err instanceof ValidationError || isValidationErrors;
}

function validationFailed(res, logger) {
  return function (err) {
    let message = getErrMessages(err);
    let status = getStatus(err);
    let code = getCode(err);
    doLog(logger, "Validation Failed ON http-response-handlers", {status: status, code: code, message: message});
    return res.status(status).json({code: code, message: message});
  };
}

function _isMongoDbConflict(err) {
  if (err && err.err) {
    if (err.err.indexOf("E11000 duplicate key error index") > -1) {
      return true;
    }
  }
  return false;
}

function error(res, logger) {
  return function (err) {
    if (isValidationError(err)) {
      return validationFailed(res, logger)(err);
    } else if (_isMongoDbConflict(err)) {
      doLog(logger, "MONGO CONFLICT ON http-response-handlers.error", err);
      let e = createError(err);
      return res.status(409).json({code: e.message});
    } else {
      doLog(logger, "ERROR ON http-response-handlers.error", err);
      let e = createError(err);
      return res.status(500).json({code: e.message});
    }
  };
}

function success(res, code) {
  return function (data) {
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