"use strict";

let ValidationError = require("./validation-error");

function getErrMessages(err) {
  return Array.isArray(err) ? err.map((e) => { return e.message;}).join(", ") : err.message;
}

function getStatus(err) {
  return Array.isArray(err) ? createError(err[0]).status : createError(err).status;
}

function getCode(err) {
  return Array.isArray(err) ? createError(err[0]).code : createError(err).code;
}

function validationFailed(res) {
  return function (err) {
    let message = getErrMessages(err);
    let status = getStatus(err);
    let code = getCode(err);
    res.status(status).json({code: code, message: message});
  };
};

function doLog(logger, msg, err) {
  if (logger && logger.error) {
    logger.error(msg, err);
  }
}

function error(res, logger) {
  return function (err) {
    let isValidationErrors = Array.isArray(err) && err.every((e) => {return e instanceof ValidationError;});
    if (err instanceof ValidationError || isValidationErrors) {
      return validationFailed(res)(err);
    } else {
      doLog(logger, "ERROR ON http-response-handlers.error", err);
      let e = createError(err);
      return res.status(500).json({code: e.message});
    }
  };
};

function success(res, code) {
  return function (data) {
    let status = 200;
    if (code > 200 && code <= 208) {
      status = code;
    }
    res.status(status).json(data);
  };
};

function createError(err) {
  let error = err;
  if (!err || typeof(err.message) !== "string" || !err.message.indexOf) {
    error = new Error(err);
  }
  return error;
};

exports.error = error;
exports.success = success;
exports.createError = createError;
