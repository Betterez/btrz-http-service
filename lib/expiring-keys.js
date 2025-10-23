class ExpiringKeys {
  constructor(db) {
    this.db = db;
  }

  /**
   * Sets a key in the database with an expiration time, only if the key does not already exist.
   * The value is set to "processing". Uses NX (set if not exists) and PX (expire in milliseconds).
   *
   * @param {string} key - The key to set in the database.
   * @param {number} [expire=15000] - Expiration time in milliseconds. Defaults to 15000ms if not provided.
   * @param {function(Error, string|null):void} callback - Callback function with parameters:
   *   - err: Error object if an error occurred.
   *   - response: "OK" if the key was set (did not exist), null if the key already exists (action in progress).
   */
  setKey(key, expire, callback) {
    this.db.set(key, "processing", "NX", "PX", expire || 15000, callback);
  }

  /**
   * Core logic for checking and setting expiring keys.
   * Can be called directly or used within middleware.
   *
   * @param {Object} params - Parameters object
   * @param {Object} params.req - Request object (for middleware) or data object (for direct calls)
   * @param {Object} params.res - Response object (for middleware) or null (for direct calls)
   * @param {Function} params.next - Next function (for middleware) or callback (for direct calls)
   * @param {Object} params.opts - Options object
   * @param {string|Array} params.opts.lookup - Lookup configuration
   * @param {string} [params.opts.path] - Path override
   * @param {string} [params.opts.method] - Method override
   * @param {Function} [params.opts.onKeyFound] - Handler when key is found
   * @param {string} [params.opts.message] - Message for key found handler
   * @param {boolean} [params.opts.checkForKeyOnly] - Only check, don't set key
   * @param {number} [params.opts.expire] - Expiration time in milliseconds
   */
  checkAndSetKey(params) {
    const { req, res, next, opts } = params;

    if (!opts.lookup) { 
      return next();
    }
    if (!opts.path && !req.path) {
      return next();
    }
    if (!opts.method && !req.method) {
      return next();
    }
    
    opts.lookup = Array.isArray(opts.lookup) ? opts.lookup : [opts.lookup];
    opts.onKeyFound = typeof opts.onKeyFound === "function" ? opts.onKeyFound : (req, res, next) => {
      return res.status(409).send(opts.message || "A blocking key was found");
    };
    
    const lookups = opts.lookup.map((item) => {
      if (item.keyName && item.alternateKeyName) {
        const keyName = item.alternateKeyName;
        return `${keyName}:${item.keyName.split(".").reduce((prev, cur) => {
          return prev[cur];
        }, req)}`;
      }

      try {
        return `${item}:${item.split(".").reduce((prev, cur) => {
          return prev[cur];
        }, req)}`;
      } catch (err) {
        return "error:undefined"; 
      }
    });
    
    const path = opts.path || req.path;
    const method = (opts.method || req.method).toLowerCase();
    const noValue = lookups.find((lookup) => {
      return lookup.endsWith("undefined");
    });
    
    if (noValue) {
      return next();
    }

    const key = `key:${path}:${method}:${lookups.join(":")}`;

    this.db.get(key, (err, value) => {
      if (err) {
        return next();
      }
      if (value) {
        return opts.onKeyFound(req, res, next);
      }
      if (opts.checkForKeyOnly) {
        return next();
      }

      this.setKey(key, opts.expire, (err, result) => {
        if (!result) {
          return opts.onKeyFound(req, res, next);
        }

        req.uniqueRequestKey = key;
        return next();
      });
    });
  }

  /**
   * Middleware function that wraps the core logic for Express.js middleware usage.
   *
   * @param {Object} opts - Options object
   * @returns {Function} Express middleware function
   */
  middleWare(opts) {
    // eslint-disable-next-line func-style
    return (req, res, next) => {
      return this.checkAndSetKey({ req, res, next, opts });
    };
  }

  /**
   * Direct function call for checking and setting expiring keys without middleware.
   *
   * @param {Object} data - Data object containing the values to check
   * @param {Object} opts - Options object
   * @param {Function} callback - Callback function
   */
  checkKey(data, opts, callback) {
    // Create a mock request-like object for direct calls
    const mockReq = {
      path: data.path,
      method: data.method,
      ...data
    };

    // Create a mock response object for direct calls
    const mockRes = {
      status: (code) => ({
        send: (message) => callback(new Error(message), null)
      })
    };

    // Create a mock next function for direct calls
    const mockNext = (err) => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, { uniqueRequestKey: mockReq.uniqueRequestKey });
    };

    this.checkAndSetKey({ req: mockReq, res: mockRes, next: mockNext, opts });
  }

  clean(key) {
    this.db.del(key, (err, result) => {
      return result;
    });
  }
}

module.exports = ExpiringKeys;
