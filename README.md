btrz-service-req-res
====================

HTTP request/response related utilities for Betterez APIs

Utilities:

* Swagger request handler formatter

Generates a definition for swagger including a request handler and it's schema.

An example Handler Class must implement "getSpec()" and "handler(req, res)" methods, like:

    class RequestHandler {
      getSpec () {
        return {
          "description" : "endpoint description",
          "path" : "/endpoint",
          "summary" : "endpoint summary",
          "method": "POST",
          "parameters": [
            this.swagger.paramTypes.body("items", "the items", "Schema", null, true),
          ],
          "produces" : ["application/json"],
          "type" : "Schema",
          "errorResponses" : [],
          "nickname" : "nick"
        };
      }
      handler (req, res) {
        .... request handler code ...
      }
    }

So to generate the swagger request handler:

    let swaggerRequestHandler = require("btrz-service-req-res").swaggerRequestHandler;
    let handler = new RequestHandler();
    let swaggerHandler = swaggerRequestHandler(handler);

* Success/Error handlers

Success handler expects data to be send with 200 OK status code.

Error handler expects an Error (or a ValidationError, see below). And responds with the error message and status code 400 (status code can be overriden, see below).

Sample usage:

    class RequestHandler {
      getSpec () {
       .......
      }
      handler (req, res) {
       doSomethingAsync(req.body)
         .then(function () {
          return doSomethingElse();
        })
        .then(ResponseHandlers.success(res))
        .catch(ResponseHandlers.error(res));
     }
    }

Notice that ResponseHandlers.success and ResponseHandlers.error both expect the response object, and return a function.

Notice that ResponseHandlers.success and ResponseHandlers.error must be added at the end of the promises chain, and only once.

* Swagger Schema Validation

Validates a body against a handler schema (a schema like the one in getSpec() above).
Returns an array of ValidationErrors with any schema mismatch.
  
    let validateSwaggerSchema = require("btrz-service-req-res").validateSwaggerSchema;
    validateSwaggerSchema(validatorFunction, handlerSpec, schemaModelsDefinitionJSON, requestObject)

* ValidationError error type

The Error request handler will catch any error and send a 500 response with the message.

If it recieves a ValidationError or an array of ValidationErrors, it will send a response with the message and status code 400.

To change the HTTP status code, throw a validation error like:

    throw new ValidationError(message, statusCode);

for example:

    throw new ValidationError("Cart not found", 404);

