"use strict";

let ValidationError = require("./validation-error");

let validateSwaggerSchema = function (validator, spec, models, req) {
  let swaggerValidation = validator(spec, req, models);
  if (swaggerValidation.length) {
    return Promise.reject(swaggerValidation.map((err) => {
      if (err.failedValue && err.path) {
        const wrongValue = err.failedValue ? `"${err.failedValue}"` : "";
        err.error.message += ` - ${wrongValue} in ${err.path}`;
      }
      return new ValidationError("WRONG_DATA", err.error.message);
    }));
  }
  return Promise.resolve();
};

module.exports = validateSwaggerSchema;
