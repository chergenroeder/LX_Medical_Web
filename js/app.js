/*
 * Copyright (c) 2017 Oracle. All rights reserved.
 *
 * This material is the confidential property of Oracle Corporation or its
 * licensors and may be used, reproduced, stored or transmitted only in
 * accordance with a valid Oracle license or sublicense agreement.
 */
/*
 * CMH Notes: Called from Index.html this is where we log into the service and
 * set the user values including new Engagement scenario.
/*
 * This is the Live Experience sample app.
 * It uses require.js for dependency management.
 * The Live Experience web component is imported as 'lx'
 */
define(["lx", "auth"], function (lx, auth) {
  "use strict";

  /**
   * Live Experience sample app.
   * @constructor
   */
  class LxApp {
    constructor() {
      this.nonce = new Date().getTime();
      this.defaultAddress = "https://ignite.oraclecloud.com";
      this.defaultTenant = "ChuckMichaelHergenroeder3";
    }

    /**
     * Initialise the Live Experience controller
     * @param rootTag
     */
     initApp(rootTag) {
       // retrieve the auth token from the customer-auth-module
       this.getAuthToken((token) => {
         lx.controller.service.authToken = token;
         lx.controller.service.userID = this.getUsername();
         lx.controller.service.tenantID = this.getTenant();
         // overriding the address is only required on test environments
         lx.controller.service.address = this.getLXAddress();
         // required context attribute:
         lx.controller.contextAttributes.set("appLocation", "Medical Appointment");
         // optional context attributes:
         lx.controller.contextAttributes.set("email", sessionStorage.getItem('email'));
         lx.controller.contextAttributes.set("fullName", sessionStorage.getItem('fullname'));
         lx.controller.contextAttributes.set("phone", "N/A");
         if ( sessionStorage.getItem("UserLocation") == null ) {
       		lx.controller.contextAttributes.set("location", "Not Defined");
   			 } else {
   				lx.controller.contextAttributes.set("location", sessionStorage.getItem("UserLocation"));
   			 }


         // add the Live Experience web component to the page
         lx.controller.addComponent(rootTag);
       });
     }

    getAuthToken(callback) {
      let xhr = new XMLHttpRequest();
      // xhr.open("GET", "/cgi-bin/auth.sh", true);
      //Chanced for ignitedemos
      xhr.open("GET", "../cgi-bin/auth.sh", true);
      xhr.setRequestHeader("Accept","application/json");
      xhr.onload = function () {
        console.log("Got response from AuthMS: ", xhr.response);
        // Extract the access_token field from the response
        let response = JSON.parse(xhr.responseText);
        console.log(response.access_token);

        // Save the JWT in session storage...
        sessionStorage.setItem("SampleAppJwtToken", response.access_token);
        callback(response.access_token);
      };
      xhr.send();
    }

    /**
     * Extract the address of the Live Experience service, if provided as a query parameter.
     * @returns {string} the Live Experience service address.
     */
    getLXAddress() {
      // Get the LX service address - from either the last session or (preferably) this URL
      let lxAddress = sessionStorage.getItem("SampleAppLXAddress");
      console.log("LX URL from previous use=" + lxAddress);

      let hashArgs = auth.authorization.getQueryArguments();
      if (hashArgs.service) {
        lxAddress = hashArgs.service;
        console.log("LX URL obtained from # args=" + lxAddress);
      } else {
        let searchArgs = auth.authorization.getQueryParams();
        if (searchArgs.service) {
          lxAddress = searchArgs.service;
          console.log("LX URL obtained from ? args=" + lxAddress);
        }
      }
      if (!lxAddress) {
        // use the default Live Experience address
        lxAddress = this.defaultAddress;
      }
      console.log("Saving LX URL='" + lxAddress + "'");
      sessionStorage.setItem("SampleAppLXAddress", lxAddress);
      return lxAddress;
    }

    /**
     * Extract the tenant name if provided as a query parameter.
     * @returns {string} the tenant name.
     */
    getTenant() {
      // Get the LX service address - from either the last session or (preferably) this URL
      let tenant = sessionStorage.getItem("SampleAppTenant");
      console.log("Tenant from previous use=" + tenant);

      let hashArgs = auth.authorization.getQueryArguments();
      if (hashArgs.tenant) {
        tenant = hashArgs.tenant;
        console.log("Tenant obtained from # args=" + tenant);
      } else {
        let searchArgs = auth.authorization.getQueryParams();
        if (searchArgs.tenant) {
          tenant = searchArgs.tenant;
          console.log("Tenant obtained from ? args=" + tenant);
        }
      }
      if (!tenant) {
        // use the default Tenant name
        tenant = this.defaultTenant;
      }
      console.log("Saving Tenant='" + tenant + "'");
      sessionStorage.setItem("SampleAppTenant", tenant);
      return tenant;
    }

    /**
     * Get the username either from session storage or generated.
     */
    getUsername() {
      let username = sessionStorage.getItem("SampleAppUsername");
      if (!username) {
        username = "customer" + this.nonce + "@example.com";
        sessionStorage.setItem("SampleAppUsername", username);
      }
      return username;
    }

  } //End-of-LxApp

  /*
   * Export an instance via the 'lxApp' variable.
   */
  return {
    lxApp: new LxApp()
  };
});
