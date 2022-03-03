class ExpiringKeys {
  constructor(db) {
    this.db = db;
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

        this.db.set(key, "processing", "PX", opts.expire || 15000, (e) => {
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
