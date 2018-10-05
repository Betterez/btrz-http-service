btrz-service-req-res
====================

HTTP request/response related utilities for Betterez APIs

Utilities:

### Swagger request handler formatter

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

Just like in Express with Connect, "multiple callback functions that behave just like middleware" can be given to swaggerRequestHandler, and they will be called one after the other.
Middleware callbacks must have the following signature: function (req, res, next)
The last argument of swaggerRequestHandler must always be a Handler instance implementing "getSpec()" and "handler(req, res)" methods. 
An example:

    let swaggerRequestHandler = require("btrz-service-req-res").swaggerRequestHandler;
    let handler = new RequestHandler();
    let swaggerHandler = swaggerRequestHandler(passportAuthenticate, otherMiddleware, handler);

### Success/Error handlers

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

### Swagger Schema Validation

Validates a body against a handler schema (a schema like the one in getSpec() above).
Returns an array of ValidationErrors with any schema mismatch.
  
    let validateSwaggerSchema = require("btrz-service-req-res").validateSwaggerSchema;
    validateSwaggerSchema(validatorFunction, handlerSpec, schemaModelsDefinitionJSON, requestObject)

### ValidationError error type

Subclass of Error, supporting an error code, message, and HTTP status override.
Usage:

    throw new ValidationError(errorCode, message, statusCode);
    throw new ValidationError("CODE", "readable message", 418)

The Error request handler will catch any error and send a 500 response with the message.

If it receives a ValidationError or an array of ValidationErrors, it will send a response with the message and status code 400.

To change the HTTP status code, throw a validation error like:

    throw new ValidationError(errorCode, message, statusCode);

for example:

    throw new ValidationError("NO_CART", "Cart not found", 404);

### Paginated Response Builder

This utility builds a standard response for a paginated resource.

Inputs:

- result: the list of resources in the current page, in the form {resourceName: list}
- query: the query directly from the request (req.query)
- totalRecords: the count of all the resources
- pageSize: the page size from the config (config.pageSize)
- baseUrl: the FULL url of the resource (domain/api/resource)

Output:

    {
      resourceName: list, // the resourceName as given in the "result" input
      count, // the "totalRecords" input
      next, // the full URL to the next page, empty string if no next page
      previous // the full URL to the previous page, empty string if no previous page
    }

Usage example in Handler:

    const result = {customers: countedCustomers.list},
      url = `${this.config.fullDomain()}/accounts${this.getSpec().path}`;
    return ResponseBuilder.buildResponse(result, req.query, countedCustomers.count, this.config.pageSize, url);
