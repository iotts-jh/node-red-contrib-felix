node-red-contrib-felix
======================

A collection of [node-red](http://nodered.org) nodes for the IOT Technology Solutions **Felix** platform

***The use of these nodes requires that an account first be setup on the Felix platform hosted by IOT Technology Solutions. Please go to http://www.iottechnology.com to find out more about the Felix platform and FelixKnows for manufacturing.***


## Installation

To install the stable version run the following command in your Node-RED user directory (typically `~/.node-red`):

    npm i node-red-contrib-felix
    
Start/Restart your Node-RED instance and you should have the Felix nodes listed in the next section available in the palettes.

## Node List
 - Felix Data (IoT Technology Solutions)


### Descriptions

##### Felix-Data
This node allows a named field from the input message.payload to be posted to Felix's data collector. You must have the following information to configure the node:
- API Key - the Felix API Key used to authenticate the data stream.
- Device - the unique Device Identifier used to identify the source of the data.
- Channel/Path - the path name to assign the channel/stream of data within Felix.
- Value - the name of the field within the Input Message that contains the data value, unless the payload field itself contains the data value.
- Units - optional "units" string to report with the data values.
- URL - the URL of the data collector for the Felix platform to report the data to.
