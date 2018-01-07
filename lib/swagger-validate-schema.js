"use strict";
const _ = require("lodash");

let ValidationError = require("./validation-error");

let validateSwaggerSchema = function (validator, spec, _models, req) {

  // Clone the swagger models before submitting them for validation.  This is due to a bug in the `swagger-validation` library
  // which results in the `models` object being mutated.  This causes other bugs that are very hard to track down.
  const models = _.cloneDeep(_models);

  let swaggerValidation = validator(spec, req, models);
  if (swaggerValidation.length) {
    return Promise.reject(swaggerValidation.map((err) => {
      return new ValidationError("WRONG_DATA", err.error.message);
    }));
  }
  return Promise.resolve();
};

module.exports = validateSwaggerSchema;
