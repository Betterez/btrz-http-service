"use strict";

let _ = require("lodash"),
    ValidationError = require("./validation-error");

let validationFailed = function (res) {
  return function (err) {
    let message = _.isArray(err) ? _.pluck(err, "message").join(", ") : err.message;
    let status = _.isArray(err) ? err[0].status : err.status;
    res.status(status).json({message: message});
  };
};

let error = function (res, logger) {
  return function (err) {
    let isValidationErrors = Array.isArray(err) && _.all(err, function (e) { return e instanceof ValidationError; });
    if (err instanceof ValidationError || isValidationErrors) {
      return validationFailed(res)(err);
    }
    logger.error(err.stack || "");
    res.status(err.status || 500).json({message: err.message});
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

exports.error = error;
exports.success = success;