/**
 * Copyright IOT Technology Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NOTES
 * =====
 * - API Key is stored as a credential, so it is not included in exports
 *   (see https://nodered.org/docs/creating-nodes/credentials)
 *
 * TODOs
 * =====
 * - TODO: Allow incoming message to include apikey, device, channel, and/or units properties that if present
 *         will override the configured value.
 *
 * - TODO: Allow multiple Tag Values (and channel name and units for each) to be reported from incoming message in a
 *         single post (see Edit Dropdown Node in Dashboard palette for example of adding multiple config entries).
 *
 * - TODO: Allow setting a rate limit, and queue data values internally until time to send, but then send all values
 *         (and possibly provide ability to limit to only include last value).
 *
 * - TODO: Extract Felix URL, TLS setting, device and APIKey into a named config object/node that can be shared across
 *         Felix nodes.
 *
 * - TODO: Allow other Felix headers to be configured and/or overridden (device type, manufacturer, protocol, version).
 *
 **/

module.exports = function(RED) {
  "use strict";
  var http = require("follow-redirects").http;
  var https = require("follow-redirects").https;
  var urllib = require("url");
  var hashSum = require("hash-sum");

  function felixDataNode(config) {
    RED.nodes.createNode(this,config);
    var node = this;

    var nodeUrl = config.url;
    var nodeApiKey = this.credentials.apikey;
    var nodeDevice = config.device;
    var nodeChannel = config.channel;
    var nodeUnits = config.units;
    var nodeValTag = config.valtag;

    // if configured to use SSL/TLS, get TLS Configuration node
    if (config.tls) {
      var tlsNode = RED.nodes.getNode(config.tls);
    }

    this.reqTimeout = 10000;
    var prox, noprox;
    if (process.env.http_proxy != null) { prox = process.env.http_proxy; }
    if (process.env.HTTP_PROXY != null) { prox = process.env.HTTP_PROXY; }
    if (process.env.no_proxy != null) { noprox = process.env.no_proxy.split(","); }
    if (process.env.NO_PROXY != null) { noprox = process.env.NO_PROXY.split(","); }

    this.on("input",function(msg) {
      var preRequestTimestamp = process.hrtime();

      var url = nodeUrl;
      if (!url) {
        node.error("Data Collection URL of Felix platform must be configured");
        node.status({fill:"red",shape:"ring",text:"URL Required"});
        return;
      }
      // url must start http:// or https:// so assume http:// if not set
      if (url.indexOf("://") !== -1 && url.indexOf("http") !== 0) {
        node.warn("Invalid Transport specified in URL, only http or https supported");
        node.status({fill:"red",shape:"ring",text:"Invalid Transport"});
        return;
      }
      if (!((url.indexOf("http://") === 0) || (url.indexOf("https://") === 0))) {
        if (tlsNode) {
          url = "https://"+url;
        } else {
          url = "http://"+url;
        }
      }
      // make sure URL ends in a /
      if (url.lastIndexOf('/') !== url.length - 1) {
        url =+ '/';
      }

      if (!nodeApiKey) {
        node.error("API Key must be configured");
        node.status({fill:"red",shape:"ring",text:"API Key Required"});
        return;
      }
      if (!nodeDevice) {
        node.error("Device ID must be configured");
        node.status({fill:"red",shape:"ring",text:"Device ID Required"});
        return;
      }
      if (!nodeChannel) {
        node.error("Channel Path must be configured");
        node.status({fill:"red",shape:"ring",text:"Channel Path Required"});
        return;
      }

      url = url + nodeDevice;

      var opts = urllib.parse(url);
      opts.method = "POST";
      opts.headers = {
        "x-api-key"       : nodeApiKey,
        "x-dvc-type-cd"   : "PLC-Gateway",
        "x-mfr-id"        : "Kepware",
        "x-proto-id"      : "IOT-KEPWARE",
        "x-proto-version" : 1
      };

      var ctSet = "Content-Type"; // set default camel case
      var clSet = "Content-Length";

      var payload = null;
      var ts = (new Date()).getTime();

      var units = nodeUnits;
      if (!units) { units = ""; } else { units = 'u:"'+units+'",'; }

      if (typeof msg.payload !== "undefined") {
        if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
          payload = '{timestamp:'+ts+',values:[{id:"'+nodeChannel+'",v:"'+msg.payload+'",'+units+'q:true,t:'+ts+'}]}';
        } else if (typeof msg.payload == "number") {
          payload = '{timestamp:'+ts+',values:[{id:"'+nodeChannel+'",v:'+msg.payload+','+units+'q:true,t:'+ts+'}]}';
        } else {
          var val = msg.payload[nodeValTag];
          if (typeof val !== "undefined") {
            if (typeof val === "string") {
              payload = '{timestamp:'+ts+',values:[{id:"'+nodeChannel+'",v:"'+val+'",'+units+'q:true,t:'+ts+'}]}';
            } else if (typeof val == "number") {
              payload = '{timestamp:'+ts+',values:[{id:"'+nodeChannel+'",v:'+val+','+units+'q:true,t:'+ts+'}]}';
            } else if (typeof val == "boolean") {
              payload = '{timestamp:'+ts+',values:[{id:"'+nodeChannel+'",v:'+val+',q:true,t:'+ts+'}]}';
            } else {
              node.error("Unsupported value type: " + typeof val);
              node.status({fill:"red",shape:"ring",text:"Unsupported value type: " + typeof val});
              return;
            }
          } else {
            // field not present in message
            node.status({fill:"yellow",shape:"dot",text:"No Data"});
            return;
          }
        }
        opts.headers[ctSet] = "application/json";
        if (opts.headers['content-length'] == null) {
          if (Buffer.isBuffer(payload)) {
            opts.headers[clSet] = payload.length;
          } else {
            opts.headers[clSet] = Buffer.byteLength(payload);
          }
        }
      }
      //this.log("Payload:"+payload);

      var urltotest = url;
      var noproxy;
      if (noprox) {
        for (var i in noprox) {
          if (url.indexOf(noprox[i]) !== -1) { noproxy=true; }
        }
      }
      if (prox && !noproxy) {
        var match = prox.match(/^(http:\/\/)?(.+)?:([0-9]+)?/i);
        if (match) {
          //opts.protocol = "http:";
          //opts.host = opts.hostname = match[2];
          //opts.port = (match[3] != null ? match[3] : 80);
          opts.headers['Host'] = opts.host;
          var heads = opts.headers;
          var path = opts.pathname = opts.href;
          opts = urllib.parse(prox);
          opts.path = opts.pathname = path;
          opts.headers = heads;
          opts.method = method;
          urltotest = match[0];
          if (opts.auth) {
            opts.headers['Proxy-Authorization'] = "Basic "+new Buffer(opts.auth).toString('Base64')
          }
        }
        else { node.warn("Bad proxy url: "+process.env.http_proxy); }
      }
      if (tlsNode) {
        tlsNode.addTLSOptions(opts);
      }
      msg.requestHeaders = opts.headers;

      var req = ((/^https/.test(urltotest))?https:http).request(opts,function(res) {
        // Force NodeJs to return a Buffer (instead of a string)
        // See https://github.com/nodejs/node/issues/6038
        res.setEncoding(null);
        delete res._readableState.decoder;

        msg.statusCode = res.statusCode;
        msg.headers = res.headers;
        msg.responseUrl = res.responseUrl;
        msg.payload = [];

        msg.headers['x-node-red-request-node'] = hashSum(msg.headers);

        if (200 === res.statusCode || 202 === res.statusCode) {
          node.status({fill:"green",shape:"dot",text:"Response: " + res.statusCode});
        } else {
          node.status({fill:"red",shape:"dot",text:"Response: " + res.statusCode});
        }
        res.on('data',function(chunk) {
          if (!Buffer.isBuffer(chunk)) {
            // if the 'setEncoding(null)' fix above stops working in
            // a new Node.js release, throw a noisy error so we know
            // about it.
            throw new Error("HTTP Request data chunk not a Buffer");
          }
          msg.payload.push(chunk);
        });
        res.on('end',function() {
          if (node.metric()) {
            // Calculate request time
            var diff = process.hrtime(preRequestTimestamp);
            var ms = diff[0] * 1e3 + diff[1] * 1e-6;
            var metricRequestDurationMillis = ms.toFixed(3);
            node.metric("duration.millis", msg, metricRequestDurationMillis);
            if (res.client && res.client.bytesRead) {
              node.metric("size.bytes", msg, res.client.bytesRead);
            }
          }

          // Check that msg.payload is an array - if the req error
          // handler has been called, it will have been set to a string
          // and the error already handled - so no further action should
          // be taken. #1344
          if (Array.isArray(msg.payload)) {
            // Convert the payload to the required return type
            msg.payload = Buffer.concat(msg.payload); // bin
            msg.payload = msg.payload.toString('utf8'); // txt
            node.send(msg);
            //node.status({});
          }
        });
      });
      req.setTimeout(node.reqTimeout, function() {
        node.error("No Response from Felix",msg);
        setTimeout(function() {
          node.status({fill:"red",shape:"ring",text:"No Response from Felix"});
        },5);
        req.abort();
      });
      req.on('error',function(err) {
        node.error(err,msg);
        msg.payload = err.toString() + " : " + url;
        msg.statusCode = err.code;
        node.send(msg);
        node.status({fill:"red",shape:"ring",text:err.code});
      });
      if (payload) {
        req.write(payload);
        msg.requestPayload = payload;
      }
      req.end();
    });

    this.on("close",function() {
      node.status({});
    });
  }

  RED.nodes.registerType("felix-data", felixDataNode, {credentials: {apikey:{type:"password"}}}
  );
}
