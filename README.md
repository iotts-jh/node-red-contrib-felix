node-red-contrib-felix
======================

A collection of [node-red](http://nodered.org) nodes for the IOT Technology Solutions **Felix** platform

***The use of these nodes requires that an account first be setup on the Felix platform hosted by IOT Technology Solutions. Please go to http://www.iottechnology.com to find out more about the Felix platform and FelixKnows for manufacturing.***


## Installation

To install the stable version run the following command in your Node-RED user directory (typically `~/.node-red`):
```
npm i node-red-contrib-felix
```
Start/Restart your Node-RED instance and you should have the Felix nodes listed in the next section available in the palettes.

## Develpoment and Local testing
To test a node module locally, the npm link command can be used. This allows you to develop the node in a local directory and have it linked into a local node-red install, as if it had been npm installed.

1. In the directory containing the node’s <code>package.json</code> file, run:
```
sudo npm link
```
2. In your node-red user directory, typically <code>~/.node-red</code> run:
```
npm link node-red-contrib-felix
```
This creates the appropriate symbolic links between the two directories so Node-RED will discover the node when it starts. Any changes to the node’s file can be picked up by simply restarting Node-RED.

## Node List
 - Felix Data (IoT Technology Solutions)

## Publishing
To publish updates:
- Increment the version number in the package.json file.
- In the root project folder run the npm publish command.
```
npm publish
```
### Descriptions

##### Felix-Data
This node allows a named field from the input message.payload to be posted to Felix's data collector. You must have the following information to configure the node:
- API Key (apiKey) - the Felix API Key used to authenticate the data stream.
- Device ID (dvcId) - the unique Device Identifier used to identify the source of the data.
- Channel Path (channel) - the path name to assign the channel/stream of data within Felix.
- Value (valueTag) - the name of the field within the Input Message that contains the data value, unless the payload field itself contains the data value.
- Units (units) - optional "units" string to report with the data values.
- URL - the URL of the data collector for the Felix platform to report the data to.

NOTE: the values in parenthesis may be set as attribute values on the input messages to overrider the configured node values.
