// Generated by CoffeeScript 1.12.4
var assertType, contentTypes, encodeForm, https, isType, qs, readStream, request, responseProto, urlRE;

assertType = require("assertType");

isType = require("isType");

https = require("https");

qs = require("querystring");

urlRE = /([^\/]+)(\/.*)?/;

contentTypes = {
  binary: "application/octet-stream",
  form: "application/x-www-form-urlencoded; charset=utf-8",
  json: "application/json",
  text: "text/plain; charset=utf-8"
};

request = function(url, options) {
  var contentType, data, headers, opts, parts, query;
  assertType(url, String);
  assertType(options, Object);
  if (!url.startsWith("https://")) {
    throw Error("Only HTTPS requests are supported!");
  }
  headers = options.headers || {};
  assertType(headers, Object);
  if (headers["Accept"] == null) {
    headers["Accept"] = "*/*";
  }
  query = (query = options.query) ? isType(query, Object) ? "?" + qs.stringify(query) : "?" + query : "";
  if (data = options.data) {
    contentType = headers["Content-Type"];
    if (options.contentType) {
      assertType(options.contentType, String);
      contentType = contentTypes[options.contentType];
    }
    if (isType(data, Object)) {
      if (contentType === contentTypes.form) {
        data = encodeForm(data);
      } else {
        data = JSON.stringify(data);
        if (contentType == null) {
          contentType = contentTypes.json;
        }
      }
    } else if (Buffer.isBuffer(data)) {
      if (contentType == null) {
        contentType = contentTypes.binary;
      }
    } else {
      assertType(data, String);
      if (contentType == null) {
        contentType = contentTypes.text;
      }
    }
    headers["Content-Type"] = contentType;
    headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
  }
  parts = urlRE.exec(url.slice(8));
  opts = {
    host: parts[1],
    path: parts[2] + query,
    method: options.method,
    headers: options.headers
  };
  return new Promise(function(resolve, reject) {
    var req;
    req = https.request(opts, function(res) {
      var status;
      status = res.statusCode;
      return readStream(res, function(error, data) {
        if (error) {
          return reject(error);
        } else {
          return resolve({
            __proto__: responseProto,
            success: status >= 200 && status < 300,
            headers: res.headers,
            status: status,
            data: data
          });
        }
      });
    });
    if (data) {
      req.write(data);
    }
    return req.end();
  });
};

module.exports = request;

encodeForm = (function() {
  var encodeArray, encodeObject, encodePair, pairs;
  pairs = [];
  encodePair = function(key, value) {
    if (value === void 0) {
      return;
    }
    if (isType(value, Object)) {
      encodeObject(value, key);
      return;
    }
    if (isType(value, Array)) {
      encodeArray(value, key);
      return;
    }
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
  };
  encodeObject = function(values, parent) {
    var key;
    for (key in values) {
      encodePair(parent + "[" + key + "]", values[key]);
    }
  };
  encodeArray = function(values, parent) {
    var index;
    index = -1;
    while (++index < values.length) {
      encodePair(parent + "[" + index + "]", values[index]);
    }
  };
  return function(values) {
    var key, str;
    for (key in values) {
      encodePair(key, values[key]);
    }
    str = pairs.join("&");
    pairs.length = 0;
    return str;
  };
})();

readStream = function(stream, callback) {
  var chunks;
  chunks = [];
  stream.on("data", function(chunk) {
    return chunks.push(chunk);
  });
  stream.on("end", function() {
    return callback(null, Buffer.concat(chunks));
  });
  return stream.on("error", callback);
};

responseProto = (function() {
  var proto;
  proto = {};
  Object.defineProperty(proto, "json", {
    get: function() {
      return JSON.parse(this.data.toString());
    },
    set: function() {
      throw Error("Cannot set `json`");
    }
  });
  Object.defineProperty(proto, "text", {
    get: function() {
      return this.data.toString();
    },
    set: function() {
      throw Error("Cannot set `text`");
    }
  });
  return proto;
})();
