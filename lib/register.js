"use strict";

function register(basePath, {models, authenticator, swagger, logger, simpleDao, config}) {
  const fs = require("fs");
  const resources = fs.readdirSync(basePath);
  let _models = models;

  if (Array.isArray(resources)) {
    resources.forEach((r) => {
      const handlersPath = `${basePath}/${r}/handlers`;
      const modelsPath = `${basePath}/${r}/models`;
      if (fs.existsSync(handlersPath)) {
        const handlers = fs.readdirSync(handlersPath);
        handlers.forEach((h) => {
          const handlerPath = `${handlersPath}/${h}`;
          try {
            const Handler = require(handlerPath).Handler;
            Handler.register({
              authenticator,
              swagger,
              logger,
              simpleDao,
              config
            });
          } catch (e) {
            logger.error("register:error", handlerPath, e);
          }
        });
      }
      if (!_models || typeof _models.models !== "object") {
        _models = {
          models: {}
        };
      }
      if (fs.existsSync(modelsPath)) {
        try {
          const resourceModels = require(modelsPath).models();
          _models.models = Object.assign(_models.models, resourceModels);
        } catch (e) {
          logger.error("register:error", modelsPath, e);
        }
      }
    });
  }
  swagger.addModels(_models);
}

exports.registerModules = register;
