"use strict";

let _ = require("lodash"),
    ValidationError = require("./validation-error");

let validateSwaggerSchema = function (validator, spec, models, req) {
  let swaggerValidation = validator(spec, req, models);
  if (swaggerValidation.length) {
    return Promise.reject(_.map(swaggerValidation, function (err) {
      return new ValidationError("WRONG_DATA", err.error.message);
    }));
  }
  return Promise.resolve();
};

module.exports = validateSwaggerSchema;