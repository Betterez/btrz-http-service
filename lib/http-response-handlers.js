"use strict";

let _ = require("lodash"),
    ValidationError = require("./validation-error");

let validationFailed = function (res) {
  return function (err) {
    let message = _.isArray(err) ? _.pluck(err, "message").join(", ") : err.message;
    let statusCode = _.isArray(err) ? err[0].statusCode : err.statusCode;
    res.status(statusCode).json({message: message});
  };
};

let error = function (res, logger) {
  return function (err) {
    let isValidationErrors = Array.isArray(err) && _.all(err, function (e) { return e instanceof ValidationError; });
    if (err instanceof ValidationError || isValidationErrors) {
      return validationFailed(res)(err);
    }
    logger.error(err.stack || "");
    res.status(500).json({message: err.message});
  };
};

let success = function (res) {
  return function (data) {
    res.status(200).json(data);
  };
};

exports.error = error;
exports.success = success;