/*
 * Copyright (c) 2017 Oracle. All rights reserved.
 *
 * This material is the confidential property of Oracle Corporation or its
 * licensors and may be used, reproduced, stored or transmitted only in
 * accordance with a valid Oracle license or sublicense agreement.
 */
/*
 * CMH Comments: First Loaded as part of requireJS. Change Debuging at bottom of code / Sets Path
*/
/* jshint unused: false */
/* globals cloud */

requirejs.config({
  "baseUrl": "lx/js",
  "paths": {
    // third-party dependency paths:
    "jquery": "../lib/jquery",
    "text": "../lib/text",
    "css": "../lib/css",
    // live-experience web-component paths:
    "lx": "lx",
    "auth": "auth",
    "cloud": "cloud",
    // sample app paths:
    "app": "../../js/app"
  },
  "shim": {
    "cloud": "cloud",
    "jquery": {
      exports: ["jQuery", "$"]
    }
  }
});

// Load the main module to start the web component
require(["cloud"], function() {
  "use strict";
  console.log("Live-Experience library loaded");
  // enable debug logging within JS SDK
  //COMMENT OUT LINE 42 in Production
  cloud.setLogLevel(cloud.LOGLEVEL.DEBUG);
});
