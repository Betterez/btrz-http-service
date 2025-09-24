const {validateRequest} = require("swagger-validation");
const ValidationError = require("./validation-error");

/*
 * Validates an incoming request against a Swagger schema.
 * You can call the function in two ways:
 *
 * 1. validateSwaggerSchema(validator, spec, models, req)
 * 2. validateSwaggerSchema({spec, models, req, validator, options})
 *
 * When calling the function in the 2nd way, the 'validator' property is optional.  You can provide a 'validator' property if you want to
 * change the validator function.  The 'options' property is also optional, and controls the behaviour of swagger-validation.
 */
async function validateSwaggerSchema(arg1, spec, models, req) {
  const {_validator, _spec, _models, _req, _options} = extractArguments(arg1, spec, models, req);

  const swaggerValidationResults = _validator(_spec, _req, _models, _options);

  // As of version 10.x, swagger-validation no longer returns an array of errors, and instead returns an object with
  // a property named "errors".  Support both old and new versions of the library.
  const validationErrors = Array.isArray(swaggerValidationResults) ? swaggerValidationResults : swaggerValidationResults.errors;

  if (validationErrors.length > 0) {
    if (_options.improvedErrorMessages) {
      const errorMessage = validationErrors.map((err) => {
        return err.error.message;
      }).join(".  ");
      throw new ValidationError("WRONG_DATA", errorMessage);
    } else {
      // An array is thrown to maintain backwards compatibility.
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
}

function extractArguments(arg1, _spec, _models, _req) {
  if (typeof arg1 === "function") {
    return {
      _validator: arg1,
      _spec,
      _models,
      _req,
      _options: {}
    };
  } else {
    return {
      _validator: arg1.validator || validateRequest,
      _spec: arg1.spec,
      _models: arg1.models,
      _req: arg1.req,
      _options: {
        improvedErrorMessages: true,
        ...arg1.options
      }
    };
  }
}

module.exports = validateSwaggerSchema;
