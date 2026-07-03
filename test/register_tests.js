const {describe, it, before, beforeEach, afterEach, mock} = require("node:test");
const assert = require("node:assert/strict");
const bodyParser = require("body-parser");
const chance = require("chance").Chance();
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const {Authenticator, authPolicy, audiences} = require("btrz-auth-api-key");
const {SimpleDao} = require("btrz-simple-dao");
const swaggerFactory = require("btrz-swagger-express");
const {registerModules} = require("../index.js");
const {attachHandlerToExpressServer} = require("../lib/register");
const {ValidationError} = require("../index");

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

describe("register()", () => {
  it("should run without problems even when some of the folders don't have the right structure", () => {
    registerModules(`${__dirname}/test-register/modules`, {
      logger: console,
      models: {models: "hkasdjhasd"},
      swagger: {
        addModels(models) {
          assert.deepEqual(models.models, {
            "module1": {},
            "module2": {}
          });
        }
      }
    });
  });
});

describe("attachHandlerToExpressServer()", () => {
  const authenticatorConfig = {
    ignoredRoutes: [],
    collection: {
      name: "applications",
      property: "key"
    },
    db: {
      options: {
        database: "btrz_http_service_test",
        username: "",
        password: ""
      },
      uris: ["127.0.0.1:27017"]
    },
    internalAuthTokenSigningSecrets: {
      main: chance.hash(),
      secondary: chance.hash()
    }
  };
  const user = {
    _id: SimpleDao.objectId(),
    name: "Test",
    last: "User",
    display: "Testing",
    password: chance.hash(),
    deleted: false
  };
  const apiKey = chance.guid();
  const privateKey = chance.guid();
  const application = {accountId: SimpleDao.objectId().toString(), key: apiKey, privateKey, userId: user._id.toString()};
  const jwtTokenSigningOptions = { algorithm: "HS512", expiresIn: "2 days", issuer: "btrz-api-accounts", subject: "account_user_sign_in"};
  const jwtToken = jwt.sign({ user, aud: audiences.BETTEREZ_APP}, privateKey, jwtTokenSigningOptions);

  let expressApp;
  let mockLogger;
  let models;
  let handlerSpec;
  let handlerConfiguration;
  let authenticator;
  let btrzSwaggerExpress
  let dependencies;

  // "supertest" will throw an error if it receives a response which has the HTTP header "Content-type: application/json", but
  // which has content that cannot be parsed as JSON.  Some of our middleware code returns responses like this (responses marked
  // as JSON but which are not parseable as JSON).  This function is used to force "supertest" to parse a response as raw text.
  function parseNonJsonResponse(res, cb) {
    let data = Buffer.from("");
    res.on("data", function(chunk) {
      data = Buffer.concat([data, chunk]);
    });
    res.on("end", function() {
      cb(null, data.toString());
    });
  }

  async function dropCollection(db, collectionName) {
    const [collection] = await db.listCollections({name: collectionName}).toArray();
    if (collection) {
      await db.dropCollection(collectionName);
    }
  }

  before(async () => {
    const db = await new SimpleDao(authenticatorConfig).connect();

    // Check that the database name is the one that we configured for this test, to avoid making changes to
    // one of our public databases
    assert.equal(db.databaseName, "btrz_http_service_test");

    await dropCollection(db, authenticatorConfig.collection.name);
    await Promise.all([
      dropCollection(db, authenticatorConfig.collection.name),
      dropCollection(db, "users")
    ]);

    await Promise.all([
      db.collection(authenticatorConfig.collection.name).insert(application),
      db.collection("users").insert(user)
    ]);
  });

  beforeEach(() => {
    expressApp = express();
    mockLogger = {
      debug: mock.fn(),
      info: mock.fn(),
      error: mock.fn(),
      fatal: mock.fn()
    };
    models = {};
    handlerSpec = {
      path: "/some-endpoint",
      method: "POST",
      nickname: "someEndpoint",
      parameters: [
        {
          in: "body",
          name: "requestBody",
          schema: {
            type: "object",
            required: ["someProperty"],
            properties: {
              someProperty: {
                type: "string"
              }
            }
          },
          required: true
        }
      ],
      produces: ["application/json"],
      responses: {
        200: {
          schema: {
            $ref: "#/definitions/EndpointResponse"
          }
        }
      }
    };
    handlerConfiguration = {
      authorization: authPolicy.USER_MUST_BE_LOGGED_IN_TO_BACKOFFICE_APP
    };
    authenticator = new Authenticator(authenticatorConfig, mockLogger);
    btrzSwaggerExpress = swaggerFactory.createNew(expressApp);
    dependencies = {
      authenticator: authenticator,
      swagger: btrzSwaggerExpress,
      logger: mockLogger
    };

    expressApp.use(authenticator.initialize({userProperty: "account"}));
    expressApp.use(authenticator.authenticate());
    expressApp.use(bodyParser.json());
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("when registering a handler class which has a register() function", () => {
    it("should call the handler's register() function with the correct arguments", () => {
      class HandlerClass {
        static register = mock.fn();
        getSpec = mock.fn();
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);
      assert.strictEqual(HandlerClass.register.mock.callCount(), 1);
      assert.deepStrictEqual(HandlerClass.register.mock.calls[0].arguments, [dependencies]);
    });
  });

  describe("when registering a handler class which does not have a register() function", () => {
    it("should call the handler's constructor with the correct arguments", () => {
      const constructorSpy = mock.fn();

      class HandlerClass {
        constructor(...args) {
          constructorSpy(...args);
        }
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);
      assert.strictEqual(constructorSpy.mock.callCount(), 1);
      assert.deepStrictEqual(constructorSpy.mock.calls[0].arguments, [dependencies]);
    });

    it("should allow the handler class' getSpec() method to be static", () => {
      class HandlerClass {
        static getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);
      assert.strictEqual(HandlerClass.getSpec.mock.callCount() > 0, true);
    });

    it("should allow the handler class' getSpec() method to be an instance method", () => {
      const getSpecStub = mock.fn(() => handlerSpec);

      class HandlerClass {
        getSpec = getSpecStub;
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);
      assert.strictEqual(getSpecStub.mock.callCount() > 0, true);
    });

    it("should throw an error if the handler class has no getSpec() method", () => {
      class HandlerClass {
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        (error) => error.message === "HandlerClass has no OpenAPI specification.  The handler class must contain a 'getSpec()' function, which returns the OpenAPI specification for the endpoint."
      );
    });

    it("should throw an error if the handler class has no configuration() method", () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        (error) => error.message === "HandlerClass has no configuration.  The handler class must contain a 'configuration()' function, which returns a configuration object."
      );
    });

    it("should throw an error if the handler configuration has no authorization policy", () => {
      delete handlerConfiguration.authorization;

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        (error) => error.message === "HandlerClass has no authorization policy.  The 'configuration()' function must return an object with an 'authorization' property which describes how requests should be authorized."
      );
    });

    it("should throw an error if the 'authenticator' dependency (which comes from btrz-auth-api-key) has no 'getMiddlewareForAuthPolicy' function, indicating that the dependency is out of date", () => {
      delete authenticator.getMiddlewareForAuthPolicy;

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(() => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        new RegExp(
          "HandlerClass cannot be registered with the server because the installed version of btrz-auth-api-key is out of date.  " +
          "Upgrade btrz-auth-api-key to version 5.6.0 or greater."
        ));
    });

    it("should throw an error if the handler configuration has an unrecognized authorization policy", () => {
      handlerConfiguration.authorization = "SOME_UNKNOWN_AUTHORIZATION_POLICY";

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        /Unrecognized authorization policy: SOME_UNKNOWN_AUTHORIZATION_POLICY/
      );
    });

    it("should throw an error if the handler spec has an unrecognized HTTP method", () => {
      handlerSpec.method = "INVALID_HTTP_METHOD";

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        /Handler spec has unrecognized HTTP method "INVALID_HTTP_METHOD"/
      );
    });

    it("should throw an error if the handler instance has no 'handler()' method", () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        (error) => error.message === "HandlerClass has no 'handler(req, res)' method.  The class must contain a handler function which will receive incoming requests."
      );
    });

    for (const httpMethod of ["GET", "POST", "DELETE", "PUT", "PATCH"]) {
      it(`should attach the handler to the Express server by calling the correct method from "btrz-swagger-express" when the handler spec has the HTTP method "${httpMethod}"`, () => {
        handlerSpec.method = httpMethod;

        class HandlerClass {
          getSpec = mock.fn(() => handlerSpec);
          configuration = mock.fn(() => handlerConfiguration);
          handler = mock.fn();
        }

        const methodName = `add${capitalize(httpMethod.toLowerCase())}`;
        mock.method(btrzSwaggerExpress, methodName);
        attachHandlerToExpressServer(HandlerClass, models, dependencies);

        assert.strictEqual(btrzSwaggerExpress[methodName].mock.callCount(), 1);
      });
    }

    it("should attach the handler to the Express server, allowing it to respond to requests", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn(() => "Some endpoint response");
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      const {body} = await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(200);

      assert.equal(body, "Some endpoint response");
    });

    it("should authorize requests using the authorization policy specified in the handler configuration", async () => {
      handlerConfiguration.authorization = authPolicy.USER_MUST_BE_LOGGED_IN_TO_BACKOFFICE_APP;

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(200);

      const jwtTokenForWebsalesCustomer = jwt.sign({ user, aud: audiences.CUSTOMER}, privateKey, jwtTokenSigningOptions);
      const {body} = await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtTokenForWebsalesCustomer}`)
        .send({someProperty: 'ABC'})
        .parse(parseNonJsonResponse)
        .expect(401);
      assert.equal(body, "Unauthorized");
    });

    it("should validate incoming requests against the OpenAPI spec defined for the handler", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({}) // Request body is an empty object.  The handler spec doesn't allow this
        .expect(400)
        .expect({
          code: "WRONG_DATA",
          message: "Request body is invalid: someProperty is required but is missing"
        });
    });

    it("should log when the incoming request failed validation against the OpenAPI spec", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({}) // Request body is an empty object.  The handler spec doesn't allow this
        .expect(400);

      assert.strictEqual(mockLogger.error.mock.callCount(), 1);
      assert.deepStrictEqual(mockLogger.error.mock.calls[0].arguments, [
        "Validation Failed ON http-response-handlers",
        {
          status: 400,
          code: "WRONG_DATA",
          message: "Request body is invalid: someProperty is required but is missing"
        }
      ]);
    });

    it("should log when the incoming request was modified, and properties were deleted from the request", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({
          someProperty: 'ABC',
          someUnrecognizedProperty: 'DEF' // This property is not described in the handler's spec
        })
        .expect(200);

      assert.strictEqual(mockLogger.debug.mock.callCount() > 0, true);
      assert.strictEqual(
        mockLogger.debug.mock.calls.some((call) => call.arguments[0] ===
          "The incoming request contains data that is not described in the handler's schema.  " +
          "The following properties were removed from the request body: someUnrecognizedProperty"),
        true
      );
    });

    it("should log when the incoming request was modified, and 'null' values were removed from the request", async () => {
      handlerConfiguration.validationSettings = {
        replaceValues: true,
        allPropertiesAreNullableByDefault: true,
        removeNullValuesFromObjects: true,
        removeNullValuesFromArrays: true
      };

      handlerSpec.parameters[0].schema = {
        type: "object",
        properties: {
          someProperty: {
            type: "string"
          },
          someArray: {
            type: "array",
            items: {
              type: "integer"
            }
          }
        }
      };

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({
          someProperty: null,
          someArray: [null, 1, null, 2]
        })
        .expect(200);

      assert.strictEqual(mockLogger.debug.mock.callCount() > 0, true);
      assert.strictEqual(
        mockLogger.debug.mock.calls.some((call) => call.arguments[0] ===
          "The incoming request contains 'null' values which have been removed.  " +
          "The following values were removed from the request body: someProperty, someArray[0], someArray[2]"),
        true
      );
    });

    it("should allow the behaviour of the request validation to be overridden in the handler configuration", async () => {
      handlerConfiguration.validationSettings = {
        improvedErrorMessages: false
      };

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({}) // Request body is an empty object.  The handler spec doesn't allow this
        .expect(400)
        .expect({
          code: "WRONG_DATA",
          message: "someProperty is required"
        });
    });

    it("should throw an error if the 'validationSettings' in the handler configuration is not an object", () => {
      handlerConfiguration.validationSettings = "some string";

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        (error) => error.message === "HandlerClass has invalid 'validationSettings'.  The 'validationSettings' returned by the 'configuration()' function should be an object."
      );
    });

    it("should allow custom middleware to be provided in the handler configuration, and execute that middleware after the authorization middleware but before the handler function", async () => {
      const callOrder = [];
      const authenticationMiddleware = mock.fn((req, res, next) => {
        callOrder.push("auth");
        next();
      });
      mock.method(authenticator, "getMiddlewareForAuthPolicy", () => authenticationMiddleware);

      handlerConfiguration.middleware = [
        mock.fn((req, res, next) => {
          callOrder.push("mw1");
          next();
        }),
        mock.fn((req, res, next) => {
          callOrder.push("mw2");
          next();
        })
      ];

      const handler = mock.fn(() => {
        callOrder.push("handler");
      });

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = handler;
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: "ABC"})
        .expect(200);

      assert.strictEqual(authenticationMiddleware.mock.callCount(), 1);
      assert.strictEqual(handlerConfiguration.middleware[0].mock.callCount(), 1);
      assert.strictEqual(handlerConfiguration.middleware[1].mock.callCount(), 1);
      assert.strictEqual(handler.mock.callCount(), 1);
      assert.deepStrictEqual(callOrder, ["auth", "mw1", "mw2", "handler"]);
    });

    it("should return the expected response if the custom middleware yields an error", async () => {
      handlerConfiguration.middleware = [
        mock.fn((req, res, next) => next(new Error("Some error from middleware")))
      ];

      const handler = mock.fn();

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: "ABC"})
        .expect(500)
        .expect({
          code: "Some error from middleware",
          message: "Some error from middleware"
        });

      assert.strictEqual(handler.mock.callCount(), 0);
    });

    it("should throw an error if the 'middleware' in the handler configuration is not an array", () => {
      handlerConfiguration.middleware = mock.fn();

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(
        () => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        (error) => error.message === "HandlerClass has invalid 'middleware'.  The 'middleware' returned by the 'configuration()' function should be an array."
      );
    });

    it("should throw an error if the 'middleware' array in the handler configuration contains an entry that is not a function", () => {
      handlerConfiguration.middleware = [mock.fn(), "A"];

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn();
      }

      assert.throws(() => attachHandlerToExpressServer(HandlerClass, models, dependencies),
        new RegExp(
          "HandlerClass has invalid 'middleware'.  At least one middleware is not a function.  " +
          "Each item in the 'middleware' array should be an Express middleware function."
        ));
    });

    it("should allow the handler to set the HTTP response code", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = (req, res) => {
          res.status(304);
        };
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(304);
    });

    it("should allow the handler to send content that is not JSON", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = (req, res) => {
          res.setHeader("Content-Type", "application/pdf");
          res.send("Some PDF data");
        };
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      const response = await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(200);

      assert.equal(response.headers["content-type"], "application/pdf; charset=utf-8");
      assert.equal(response.headers["content-length"], "13"); // Length of content provided to res.send(...)
      assert.equal(response.type, "application/pdf");
      assert.ok(response.body instanceof Buffer);
      assert.equal(response.body.toString(), "Some PDF data");
    });

    it("should return the expected response when the handler rejects", async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = async () => {
          throw new Error("Some unexpected error");
        };
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(500)
        .expect({
          code: "Some unexpected error",
          message: "Some unexpected error",
        });
    });

    it("should log when the handler rejects", async () => {
      const handlerError = new Error("Some unexpected error");

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = async () => {
          throw handlerError;
        };
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(500);

      assert.strictEqual(mockLogger.fatal.mock.callCount(), 1);
      assert.deepStrictEqual(mockLogger.fatal.mock.calls[0].arguments, ["ERROR ON http-response-handlers.error", handlerError]);
    });

    it(`should call the handler's "onHandlerError" method when the handler rejects, if this function is defined`, async () => {
      const handlerError = new Error("Some unexpected error");
      const onHandlerError = mock.fn();

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = async () => {
          throw handlerError;
        };
        onHandlerError = onHandlerError;
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(500)
        .expect({
          code: "Some unexpected error",
          message: "Some unexpected error",
        });
      assert.strictEqual(onHandlerError.mock.callCount(), 1);
      assert.deepStrictEqual(onHandlerError.mock.calls[0].arguments, [handlerError]);
    });

    it(`should allow the handler's "onHandlerError" function to be a static function`, async () => {
      const handlerError = new Error("Some unexpected error");
      const onHandlerError = mock.fn();

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = async () => {
          throw handlerError;
        };
        static onHandlerError = onHandlerError;
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(500)
        .expect({
          code: "Some unexpected error",
          message: "Some unexpected error",
        });
      assert.strictEqual(onHandlerError.mock.callCount(), 1);
      assert.deepStrictEqual(onHandlerError.mock.calls[0].arguments, [handlerError]);
    });

    it(`should allow developers to map errors which occur in the handler by returning a new error from the "onHandlerError" method`, async () => {
      const handlerError = new Error("Some unexpected error");
      const mappedError = new Error("Some mapped error");

      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn(() => {
          throw handlerError;
        });
        onHandlerError() {
          return mappedError;
        }
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(500)
        .expect({
          code: "Some mapped error",
          message: "Some mapped error",
        });
    });

    it(`should return the expected response when the "onHandlerError" method returns a ValidationError`, async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn(() => {
          throw new Error("Some unexpected error");
        });
        onHandlerError() {
          return new ValidationError("SOME_ERROR_CODE", "Some error message");
        }
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(400)
        .expect({
          code: "SOME_ERROR_CODE",
          message: "Some error message",
        });
    });

    it(`should return details of the error thrown by the "onHandlerError" method when it unexpectedly throws an error while processing the original error from the handler`, async () => {
      class HandlerClass {
        getSpec = mock.fn(() => handlerSpec);
        configuration = mock.fn(() => handlerConfiguration);
        handler = mock.fn(() => {
          throw new Error("Some unexpected error");
        });
        onHandlerError() {
          throw new Error("Another unexpected error");
        }
      }

      attachHandlerToExpressServer(HandlerClass, models, dependencies);

      await request(expressApp)
        .post(handlerSpec.path)
        .set("X-API-KEY", apiKey)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({someProperty: 'ABC'})
        .expect(500)
        .expect({
          code: "Another unexpected error",
          message: "Another unexpected error",
        });
    });
  });
});
