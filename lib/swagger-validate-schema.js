const ValidationError = require("./validation-error");

function validateSwaggerSchema(validator, spec, models, req) {
  const swaggerValidation = validator(spec, req, models);
  if (swaggerValidation.length) {
    return Promise.reject(swaggerValidation.map((err) => {
      if (err.failedValue && err.path) {
        const wrongValue = err.failedValue && typeof err.failedValue.toString === "function" ? `"${err.failedValue}"` : "";
        err.error.message += ` - ${wrongValue} in ${err.path}`;
      }
      return new ValidationError("WRONG_DATA", err.error.message);
    }));
  }
  return Promise.resolve();
}

module.exports = validateSwaggerSchema;
