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

  middleWare(opts) {
    // eslint-disable-next-line func-style
    return (req, res, next) => {
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
    };
  }

  clean(key) {
    this.db.del(key, (err, result) => {
      return result;
    });
  }
}

module.exports = ExpiringKeys;
