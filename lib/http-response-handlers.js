"use strict";

let _ = require("lodash"),
    ValidationError = require("./validation-error");

let validationFailed = function (res) {
  return function (err) {
    let message = _.isArray(err) ? _.pluck(err, "message").join(", ") : err.message;
    let status = _.isArray(err) ? err[0].status : err.status;
    let code = _.isArray(err) ? err[0].code : err.code;
    res.status(status).json({code: code, message: message});
  };
};

let error = function (res, logger) {
  return function (err) {
    let isValidationErrors = Array.isArray(err) && _.all(err, e => e instanceof ValidationError);
    if (err instanceof ValidationError || isValidationErrors) {
      return validationFailed(res)(err);
    } else {
      logger.error(err.stack || "");
      return res.status(500).json({code: err.message});
    }
  };
};

let success = function (res, code) {
  return function (data) {
    let status = 200;
    if (code > 200 && code <= 208) {
      status = code;
    }
    res.status(status).json(data);
  };
};

let createError = function (err) {
  let error = err;
  if (!err || !err.message || !err.message.indexOf) {
    error = new Error(err);
  }
  return error;
};

exports.error = error;
exports.success = success;
exports.createError = createError;