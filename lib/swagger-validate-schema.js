const ValidationError = require("./validation-error");

async function validateSwaggerSchema(validator, spec, models, req) {
  const swaggerValidationResults = validator(spec, req, models);

  // As of version 10.x, swagger-validation no longer returns an array of errors, and instead returns an object with
  // a property named "errors".  Support both old and new versions of the library.
  const validationErrors = Array.isArray(swaggerValidationResults) ? swaggerValidationResults : swaggerValidationResults.errors;

  if (validationErrors.length > 0) {
    throw validationErrors.map((err) => {
      let errorMessage = err.error.message;

      if (err.failedValue && err.path) {
        const wrongValue = err.failedValue && typeof err.failedValue.toString === "function" ? `"${err.failedValue}"` : "";
        errorMessage += ` - ${wrongValue} in ${err.path}`;
      }
      return new ValidationError("WRONG_DATA", errorMessage);
    });
  }
}

module.exports = validateSwaggerSchema;
