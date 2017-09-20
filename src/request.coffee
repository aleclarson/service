
formUrlEncoded = require "form-urlencoded"
assertValid = require "assertValid"
isValid = require "isValid"
qs = require "querystring"

urlRE = /([^\/:]+)(:[0-9]+)?(\/.*)?/
schemeRE = /^[^:]+/

schemes =
  http: require "http"
  https: require "https"

contentTypes =
  binary: "application/octet-stream"
  form: "application/x-www-form-urlencoded"
  json: "application/json"
  text: "text/plain; charset=utf-8"

optionTypes =
  headers: "object?"
  query: "string|object?"
  data: "string|object|buffer?"
  contentType: "string?"

request = (url, options) ->
  assertValid url, "string"
  assertValid options, optionTypes

  headers = options.headers or {}
  headers["Accept"] ?= "*/*"

  if query = options.query
    if isValid query, "object"
      query = qs.stringify query
    query = "?" + query if query
  else query = ""

  if data = options.data
    contentType = headers["Content-Type"]

    if options.contentType
      contentType = contentTypes[options.contentType]

    if isValid data, "object"

      if contentType is contentTypes.form
        data = formUrlEncoded data
        contentType += "; charset=utf-8"

      else
        data = JSON.stringify data
        contentType ?= contentTypes.json

    else if Buffer.isBuffer data
      contentType ?= contentTypes.binary

    else
      contentType ?= contentTypes.text

    headers["Content-Type"] = contentType
    headers["Content-Length"] =
      if Buffer.isBuffer data
      then data.length
      else Buffer.byteLength data

  scheme = schemeRE.exec(url)[0]
  unless schemes.hasOwnProperty scheme
    throw Error "Unsupported scheme: '#{scheme}'"

  parts = urlRE.exec url.slice scheme.length + 3
  opts =
    host: parts[1]
    path: (parts[3] or "/") + query
    method: options.method
    headers: options.headers

  if parts[2]
    opts.port = Number parts[2].slice 1

  if scheme is "https"
    if options.ssl
    then Object.assign opts, options.ssl
    else opts.rejectUnauthorized = false

  return new Promise (resolve, reject) ->
    req = schemes[scheme].request opts, (res) ->
      status = res.statusCode
      readStream res, (error, data) ->
        if error
        then reject error
        else resolve {
          __proto__: responseProto
          success: status >= 200 and status < 300
          headers: res.headers
          status
          data
        }

    req.write data if data
    req.end()

module.exports = request

#
# Helpers
#

readStream = (stream, callback) ->
  chunks = []

  stream.on "data", (chunk) ->
    chunks.push chunk

  stream.on "end", ->
    callback null, Buffer.concat chunks

  stream.on "error", callback

responseProto = do ->
  proto = {}

  Object.defineProperty proto, "json",
    get: -> JSON.parse @data.toString()
    set: -> throw Error "Cannot set `json`"

  Object.defineProperty proto, "text",
    get: -> @data.toString()
    set: -> throw Error "Cannot set `text`"

  return proto