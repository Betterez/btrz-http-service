"use strict";

const createError = require("./http-response-handlers").createError;

function register(basePath, deps) {
  const fs = require("fs");
  const resources = fs.readdirSync(basePath);

  let _models = deps.models;
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
        const handlers = fs.readdirSync(handlersPath);
        handlers.forEach((h) => {
          const handlerPath = `${handlersPath}/${h}`;
          try {
            const Handler = require(handlerPath).Handler;
            Handler.register(deps);
          } catch (e) {
            deps.logger.error("register:error", [handlerPath, e]);
            throw createError(e);
          }
        });
      }

      if (fs.existsSync(modelsPath)) {
        try {
          const resourceModels = require(modelsPath).models();
          _models.models = Object.assign(_models.models, resourceModels);
        } catch (e) {
          deps.logger.error("register:error", [modelsPath, e]);
          throw createError(e);
        }
      }
    });
  }
  deps.swagger.addModels(_models);
}

exports.registerModules = register;
