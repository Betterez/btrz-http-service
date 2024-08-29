const ValidationError = require("./validation-error");

async function validateSwaggerSchema(validator, spec, models, req) {
  const swaggerValidationResults = validator(spec, req, models);

  if (swaggerValidationResults.length > 0) {
    throw swaggerValidationResults.map((err) => {
      if (err.failedValue && err.path) {
        const wrongValue = err.failedValue && typeof err.failedValue.toString === "function" ? `"${err.failedValue}"` : "";
        err.error.message += ` - ${wrongValue} in ${err.path}`;
      }
      return new ValidationError("WRONG_DATA", err.error.message);
    });
  }
}

module.exports = validateSwaggerSchema;
