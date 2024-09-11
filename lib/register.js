const fs = require("node:fs");
const createError = require("./http-response-handlers").createError;

function attachHandlerToExpressServer(HandlerClass, dependencies) {
  HandlerClass.register(dependencies);
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

      if (fs.existsSync(handlersPath)) {
        const handlerFilenames = fs.readdirSync(handlersPath);

        handlerFilenames.forEach((handlerFilename) => {
          const handlerPath = `${handlersPath}/${handlerFilename}`;
          try {
            const HandlerClass = require(handlerPath).Handler;
            attachHandlerToExpressServer(HandlerClass, dependencies);
          } catch (e) {
            logger.error("register:error", [handlerPath, e]);
            throw createError(e);
          }
        });
      }

      if (fs.existsSync(modelsPath)) {
        try {
          const resourceModels = require(modelsPath).models();
          _models.models = Object.assign(_models.models, resourceModels);
        } catch (e) {
          logger.error("register:error", [modelsPath, e]);
          throw createError(e);
        }
      }
    });
  }

  btrzSwaggerExpress.addModels(_models);
}

exports.registerModules = register;
