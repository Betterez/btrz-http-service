const fs = require("node:fs");
const isPlainObject = require("lodash.isplainobject");
const {validateRequest} = require("swagger-validation");
const swaggerRequestHandler = require("./swagger-request-handler");
const responseHandlers = require("./http-response-handlers");
const {createError} = responseHandlers;
const ValidationError = require("./validation-error");

function getAuthorizationMiddleware(authenticator, handlerConfiguration, handlerInstance) {
  const authorizationPolicy = handlerConfiguration?.authorization;

  if (!authorizationPolicy) {
    throw new Error(`${handlerInstance.constructor.name} has no authorization policy.  ` +
      `The 'configuration()' function must return an object with an 'authorization' property which describes how requests should be authorized.`);
  }

  if (typeof authenticator.getMiddlewareForAuthPolicy !== "function") {
    throw new Error(`${handlerInstance.constructor.name} cannot be registered with the server because the installed version of ` +
      `btrz-auth-api-key is out of date.  Upgrade btrz-auth-api-key to version 5.6.0 or greater.`);
  }

  return authenticator.getMiddlewareForAuthPolicy(authorizationPolicy);
}

function validateIncomingRequestAgainstOpenApiSpec(handlerInstance, handlerConfiguration, openApiSpec, models, req) {
  const defaultValidationSettings = {
    replaceValues: true,
    allPropertiesAreNullableByDefault: false,
    treatEmptyStringsLikeUndefinedValues: false,
    removeUnrecognizedPropertiesFromObjects: true,
    requestBodyCanHaveTwoContradictorySchemas: false,
    throwErrorsWhenSchemaIsInvalid: true,
    allowStringRepresentationsOfBooleans: false,
    strictDateParsing: true,
    allowNumbersToBeStrings: false,
    allowIntegerValuesWhichMayBeParsedIncorrectly: false,
    allowStringsToHaveUnreliableDateFormat: false,
    allowSchemasWithInvalidTypesAndTreatThemLikeRefs: false,
    improvedErrorMessages: true,

    // Although Javascript cannot process some of the number formats available in the OpenAPI spec (ie. the "int64" type), using these types
    // in schemas is still useful in order to communicate our data types to 3rd parties.  For example, a 3rd party might want to know
    // whether a number will be within the range of an "int32", or whether it will exceed 2^32 and therefore falls within the range of
    // an "int64".  Communicating this to them via our swagger models allows them to allocate the right amount of memory for the data.
    // This is default behaviour of "swagger-validation" which is left unchanged by setting this flag to "true".
    allowNumberFormatsWithNoEquivalentRepresentationInJavascript: true,
    // This setting can be disabled for stricter validation of objects.  When disabled, validation will fail whenever any object contains
    // properties that are not listed in the schema.  It is incompatible with the "removeUnrecognizedPropertiesFromObjects" setting.
    objectsCanHaveAnyAdditionalPropertiesByDefault: true,
  };
  const validationSettingsOverrides = handlerConfiguration?.validationSettings;
  const validationSettings = {
    ...defaultValidationSettings,
    ...validationSettingsOverrides
  };

  const validationResult = validateRequest(openApiSpec, req, models, validationSettings);

  if (validationResult.errors.length > 0) {
    throw new ValidationError("WRONG_DATA", validationResult.errors[0].error.message);
  }
}

function addHandlerToBtrzSwaggerExpress(httpMethod, btrzSwaggerExpress, handlerChain) {
  switch(httpMethod) {
    case "GET":
      btrzSwaggerExpress.addGet(handlerChain);
      break;
    case "POST":
      btrzSwaggerExpress.addPost(handlerChain);
      break;
    case "DELETE":
      btrzSwaggerExpress.addDelete(handlerChain);
      break;
    case "PUT":
      btrzSwaggerExpress.addPut(handlerChain);
      break;
    case "PATCH":
      btrzSwaggerExpress.addPatch(handlerChain);
      break;
    default:
      throw new Error(`Handler spec has unrecognized HTTP method "${httpMethod}"`);
  }
}

function wrapHandlerWithStandardResponseProcessing(openApiSpec, models, logger, handlerConfiguration, handlerInstance) {
  return {
    getSpec() {
      return handlerInstance.getSpec?.() ?? handlerInstance.constructor.getSpec?.(); // Support static or instance methods
    },

    async handler(req, res) {
      try {
        validateIncomingRequestAgainstOpenApiSpec(handlerInstance, handlerConfiguration, openApiSpec, models, req);

        const response = await handlerInstance.handler(req, res);
        return res.status(res.statusCode).json(response);
      } catch (error) {
        let mappedError = error;

        try {
          mappedError = handlerInstance.onHandlerError?.(error) ?? handlerInstance.constructor.onHandlerError?.(error) ?? error;
        } catch (anotherError) {
          // An error was encountered while running the code in the handler's 'onHandlerError()' function.  This indicates a problem
          // with the code.  The 'onHandlerError()' function can return an error, but should not throw one.
          mappedError = anotherError;
        } finally {
          return responseHandlers.error(res, logger)(mappedError);
        }
      }
    }
  }
}

function delegateRegistrationToHandlerClass(HandlerClass, dependencies) {
  HandlerClass.register(dependencies);
}

function registerHandlerAutomatically(HandlerClass, models, dependencies) {
  const {swagger: btrzSwaggerExpress, authenticator, logger} = dependencies;

  const handlerInstance = new HandlerClass(dependencies);

  if (typeof handlerInstance.handler !== "function" && typeof handlerInstance.constructor.handler !== "function") {
    throw new Error(`${handlerInstance.constructor.name} has no 'handler(req, res)' method.  The class must ` +
      `contain a handler function which will receive incoming requests.`);
  }

  if (typeof handlerInstance.getSpec !== "function" && typeof handlerInstance.constructor.getSpec !== "function") {
    throw new Error(`${handlerInstance.constructor.name} has no OpenAPI specification.  The handler class must ` +
      `contain a 'getSpec()' function, which returns the OpenAPI specification for the endpoint.`);
  }
  const openApiSpec = handlerInstance.getSpec?.() ?? HandlerClass.getSpec(); // Support static or instance methods

  if (typeof handlerInstance.configuration !== "function" && typeof handlerInstance.constructor.configuration !== "function") {
    throw new Error(`${handlerInstance.constructor.name} has no configuration.  The handler class must ` +
      `contain a 'configuration()' function, which returns a configuration object.`);
  }
  const handlerConfiguration = handlerInstance.configuration?.() ?? handlerInstance.constructor.configuration();

  if (handlerConfiguration?.validationSettings !== undefined && !isPlainObject(handlerConfiguration?.validationSettings)) {
    throw new Error(`${handlerInstance.constructor.name} has invalid 'validationSettings'.  ` +
      `The 'validationSettings' returned by the 'configuration()' function should be an object.`);
  }

  if (handlerConfiguration?.middleware !== undefined) {
    if (!Array.isArray(handlerConfiguration.middleware)) {
      throw new Error(`${handlerInstance.constructor.name} has invalid 'middleware'.  ` +
        `The 'middleware' returned by the 'configuration()' function should be an array.`);
    } else if (handlerConfiguration.middleware.some(middleware => typeof middleware !== "function")) {
      throw new Error(`${handlerInstance.constructor.name} has invalid 'middleware'.  ` +
        `At least one middleware is not a function.  Each item in the 'middleware' array should be an Express middleware function.`);
    }
  }
  const middleware = handlerConfiguration?.middleware ?? [];

  const authorizationMiddleware = getAuthorizationMiddleware(authenticator, handlerConfiguration, handlerInstance);
  const handlerChain = swaggerRequestHandler(
    authorizationMiddleware,
    ...middleware,
    wrapHandlerWithStandardResponseProcessing(openApiSpec, models, logger, handlerConfiguration, handlerInstance)
  );
  addHandlerToBtrzSwaggerExpress(openApiSpec.method, btrzSwaggerExpress, handlerChain);
}

function attachHandlerToExpressServer(HandlerClass, models, dependencies) {
  if (typeof HandlerClass.register === "function") {
    delegateRegistrationToHandlerClass(HandlerClass, dependencies);
  } else {
    registerHandlerAutomatically(HandlerClass, models, dependencies);
  }
}

function register(basePath, dependencies) {
  const {logger, swagger: btrzSwaggerExpress} = dependencies;
  const resources = fs.readdirSync(basePath);

  let _models = dependencies.models;
  if (!_models || typeof _models.models !== "object") {
    _models = {
      models: {}
    };
  }

  if (Array.isArray(resources)) {
    resources.forEach((r) => {
      const handlersPath = `${basePath}/${r}/handlers`;
      const modelsPath = `${basePath}/${r}/models`;

      let resourceModels = {};

      if (fs.existsSync(modelsPath)) {
        try {
          resourceModels = require(modelsPath).models();
          _models.models = Object.assign(_models.models, resourceModels);
        } catch (e) {
          logger.error("register:error", [modelsPath, e]);
          throw createError(e);
        }
      }

      if (fs.existsSync(handlersPath)) {
        const handlerFilenames = fs.readdirSync(handlersPath);

        handlerFilenames.forEach((handlerFilename) => {
          const handlerPath = `${handlersPath}/${handlerFilename}`;
          try {
            const HandlerClass = require(handlerPath).Handler;
            attachHandlerToExpressServer(HandlerClass, resourceModels, dependencies);
          } catch (e) {
            logger.error("register:error", [handlerPath, e]);
            throw createError(e);
          }
        });
      }
    });
  }

  btrzSwaggerExpress.addModels(_models);
}

exports.registerModules = register;
exports.attachHandlerToExpressServer = attachHandlerToExpressServer;
