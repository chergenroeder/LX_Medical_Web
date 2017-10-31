/*
 * Copyright (c) 2017 Oracle. All rights reserved.
 *
 * This material is the confidential property of Oracle Corporation or its
 * licensors and may be used, reproduced, stored or transmitted only in
 * accordance with a valid Oracle license or sublicense agreement.
 */

/**
 * Note: this code is copied from: Cloud/product/auth/provider/src/main/webapp/js/auth.js
 * Authorization library functions for use across DK.
 *
 * @module auth - using pure JS, no library dependencies as yet.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('jquery'));
  } else {
    // Browser globals (root is window)
    //noinspection JSUnresolvedVariable
    root.auth = factory(root.$);
  }
}(this, function ($) {
  "use strict";

  /**
   * An object that knows how to ascertain the logged in user's JWT token for use in REST queries.
   *
   * TODO: JWT validation including signature verification using Auth MS public key
   */
  var Authorization = function() {
    var self = this;

    // Default to 1 hour
    var JWT_EXPIRY_SECONDS = 3600;

    // Local storage keys.
    var jwtKey = 'CloudAuthJWTKey';
    var jwtExpiryTimeKey = 'CloudAuthJWTExpiryTimeKey';
    var userNameKey = 'CloudUserNameKey';
    var tenantOwningJWTKey = 'CloudAuthTenantKey';
    var authKey = 'CloudAuthKey';
    var cloudAddressKey = 'CloudAddress';

    var jwtValue = '';
    var jwtExpiryTime = null;
    var userNameValue = '';
    var tenantOwningJWTValue = '';
    var authValue = '';
    var cloudAddressValue = '';

    var loggingOut = false;

    // Capture the passed arguments string into a form we can use.
    self.getArguments = function(args) {
      var params = {};
      var regex = /([^&=]+)=([^&]*)/g;
      var m = regex.exec(args);
      while (m) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        m = regex.exec(args);
      }
      return params;
    };

    // Capture the current hash arguments into a form we can use.
    self.getQueryArguments = function() {
      return self.getArguments(location.hash.substring(1));
    };

    // Capture the current search arguments into a form we can use.
    self.getSearchArguments = function() {
      return self.getArguments(location.search.substring(1));
    };

    /**
     * Get query parameters.
     */
    self.getQueryParams = function() {
      var match, pl = /\+/g,
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = location.search.substring(1);
      var urlParams = {};
      while (!!(match = search.exec(query))) {
        urlParams[decode(match[1])] = decode(match[2]);
      }
      return urlParams;
    };

    /**
     * Set JWT in local storage - along with its owning tenant.
     */
    self.setJWT = function(value, tenantName, username, expiresIn) {
      console.log("setJWT: jwtKey=" + value + ", tenantOwningJWTKey=" + tenantName + ", userNameKey=" + username);
      var expiryTime = null;
      try {
        localStorage.setItem(jwtKey, value);
        localStorage.setItem(tenantOwningJWTKey, tenantName);
        localStorage.setItem(userNameKey, username);
        console.log("JWT expires in: " + expiresIn);
        if (!expiresIn) {
          expiresIn = JWT_EXPIRY_SECONDS;
        }
        // This is a prediction only. Shorten time by 2 minutes if possible as prediction may not be absolutely
        // accurate anyway due to latency and other small delays. Allows detection before actual expiry.
        expiryTime = Date.now() + (expiresIn > 200 ? expiresIn - 120 : expiresIn) * 1000;
        localStorage.setItem(jwtExpiryTimeKey, expiryTime);
        console.log("expiryTime = " + expiryTime);
      } catch (e) {
        console.log("Unable to set JWT, Storing locally");
        jwtValue = value;
        jwtExpiryTime = expiryTime;
        tenantOwningJWTKey = tenantName;
        userNameValue = username;
      }
    };

    /**
     * Get User Name in local storage.
     */
    self.getUserName = function() {
      try {
        return localStorage.getItem(userNameKey);
      } catch (e) {
        return userNameValue;
      }
    };

    /**
     * Set User Name in local storage.
     */
    self.setUserName = function(userName) {
      try {
        return localStorage.setItem(userNameKey, userName);
      } catch (e) {
        userNameValue = userName;
      }
    };

    /**
     * Get Auth value in local storage.
     */
    self.getAuth = function() {
      try {
        return sessionStorage.getItem(authKey);
      } catch (e) {
        return authValue;
      }
    };

    /**
     * Set Auth value in local storage.
     */
    self.setAuth = function(auth) {
      try {
        return sessionStorage.setItem(authKey, auth);
      } catch (e) {
        authValue = auth;
      }
    };

    /**
     * Return whatever tenant we have in local storage.
     */
    self.getTenantName = function() {
      try {
        return localStorage.getItem(tenantOwningJWTKey);
      } catch (e) {
        return tenantOwningJWTValue;
      }
    };

    /**
     * Set tenant name in local storage.
     */
    self.setTenantName = function(tenantName) {
      try {
        return localStorage.setItem(tenantOwningJWTKey, tenantName);
      } catch (e) {
        tenantOwningJWTValue = tenantName;
      }
    };

    /**
     * Return whatever JWT we have in local storage.
     */
    self.getJWT = function() {
      var jwt;
      try {
        jwt = localStorage.getItem(jwtKey);
      } catch (e) {
        jwt = jwtValue;
      }
      console.log("getJWT: jwtKey=" + jwt);
      return jwt;
    };

    /**
     * Remove JWT from local storage.
     */
    self.removeJWT = function() {
      console.log('removing JWT from local storage..');
      try {
        localStorage.removeItem(jwtKey);
      } catch (e) {
        jwtValue = '';
      }
    };

    /**
     * Get the JWT Expiry time.
     */
    self.getJWTExpiryTime = function() {
      var expiryTime = jwtExpiryTime;
      try {
        expiryTime = localStorage.getItem(jwtExpiryTimeKey);
      } catch (e) {
        expiryTime = jwtExpiryTime;
      }
      if (!expiryTime) {
        expiryTime = jwtExpiryTime;
      }
      console.log("getJWT: getJWTExpiryTime=" + expiryTime);
      return expiryTime;
    };

    /**
     * Clean local storage (except for tenant key).
     */
    self.cleanSessionStorage = function() {
      self.removeJWT();
      try {
        localStorage.removeItem(userNameKey);
        sessionStorage.removeItem(authKey);
        localStorage.removeItem(jwtExpiryTimeKey);
      } catch (e) {
        userNameValue = '';
        authValue = '';
      }
    };

    /**
     * Clean local storage as much as possible and invalidate the session.
     */
    self.cleanSessionAndLogout = function() {
      try {
        console.log('CleanUp other local items..');
        localStorage.removeItem(userNameKey);
        sessionStorage.removeItem(authKey);
        localStorage.removeItem(jwtKey);
        localStorage.removeItem(jwtExpiryTimeKey);
      } catch (e) {
        userNameValue = '';
        authValue = '';
        jwtValue = '';
      }
      self.logout();
    };

    /**
     * A function to derive the cloud address if we're not given it.
     */
    self.getCloudAddress = function() {
      // Get the cloud address - from either the last session or (preferably) this URL
      var cloudAddress;
      try {
        cloudAddress = localStorage.getItem(cloudAddressKey);
      } catch (e) {
        cloudAddress = cloudAddressValue;
      }
      console.log("Cloud URL from previous use=" + cloudAddress);

      var hashArgs = self.getQueryArguments();
      if (hashArgs.cloud) {
        cloudAddress = hashArgs.cloud;
        console.log("Cloud URL obtained from # args=" + cloudAddress);
      } else {
        var searchArgs = self.getQueryParams();
        if (searchArgs.cloud) {
          cloudAddress = searchArgs.cloud;
          console.log("Cloud URL obtained from ? args=" + cloudAddress);
        }
      }
      if (!cloudAddress) {
        // Generic workaround for IE's lack of window.location.origin
        if (!window.location.origin) {
          window.location.origin = window.location.protocol + "//" + window.location.hostname +
            (window.location.port ? ':' + window.location.port : '');
        }
        cloudAddress = window.location.origin;
      }
      console.log("Saving cloud URL='" + cloudAddress + "'");
      try {
        localStorage.setItem(cloudAddressKey, cloudAddress);
      } catch (e) {
        cloudAddressValue = cloudAddress;
      }
      return cloudAddress;
    };

    /**
     * Invalidate the server-side session.
     */
    self.logout = function() {
      var logOutUri = localStorage.getItem(cloudAddressKey) + "/auth/user/api/authorize";
      console.log('Logging out ' + logOutUri);
      $.ajax({
        url: logOutUri,
        type: 'DELETE',
        data: {},
        success: function() {
          console.log('Logged out');
        }
      });
    };

    /**
     * Our main method: check that the user is authorized (has a JWT with user claims).
     * <p/>
     * The JWT may prove to be invalid when we attempt to use it later to open a web socket connection (e.g. it may
     * have expired).
     * If there is no JWT, redirect to the login page.
     * @param tenantName the name of the tenant (needed for authentication client_id).
     * @param appName the name of the app using the Auth MS (appears on login dialog if prompted).
     * @param authRequired Flag to indicate if auth is required (Y/N)
     * @param guestName Guest user name
     * @param cloudAddress the URL for addressing the WSC cloud
     * @param authApiPath the path to the customer's own authentication rest api.
     * @return either a resolved promise or no return (redirect to login page), depending on whether the user has a JWT
     */
    self.checkAuthorization = function(tenantName, appName, authRequired, guestName, cloudAddress, authApiPath) {

      // If we have no cloud address we will derive one for ourselves.
      if (!cloudAddress) {
        cloudAddress = self.getCloudAddress();
      }

      console.log('checkAuthorization() entered with tenantName=' + tenantName + ', appName=' + appName +
        ', authRequired=' + authRequired + ', guestName=' + guestName + ', cloudAddress=' + cloudAddress +
        ', authApiPath=' + authApiPath);

      var queryArgs = self.getQueryArguments();
      var knownJWT = self.getKnownJWT(tenantName, queryArgs);
      var jwtExpiryTime = self.getJWTExpiryTime();
      if (knownJWT) {
        console.log("we have a JWT for this tenant - assuming logged in..");
        if (jwtExpiryTime && jwtExpiryTime > Date.now()) {
          console.log("JWT hasn't expired yet, so use it");
          return Promise.resolve();
        }
        console.log("JWT has expired - request a new one");
        return self.requestToken(cloudAddress);
      } else {
        // No JWT available, so we request a login of the Auth MS
        var searchArgs = self.getSearchArguments();
        console.log('checkAuthorization(): we need to login');
        self.presentLogin(tenantName, appName, authRequired, guestName, searchArgs.retryCount || 0,
          cloudAddress, authApiPath);
        return Promise.reject();
      }
    };

    /**
     * Request a new access token using an existing server session.
     * @param cloudAddress the URL for addressing the WSC cloud
     * @returns a promise that will be resolved when the token is returned
     */
    self.requestToken = function(cloudAddress) {
      // If we have no cloud address we will derive one for ourselves.
      if (!cloudAddress) {
        cloudAddress = self.getCloudAddress();
      }

      return $.ajax({
        url: cloudAddress + "/auth/user/api/authorize/token",
        xhrFields: {
          withCredentials: true
        }
      });
    };

    /**
     * Replace a jQuery ajax function with custom one that adds authentication handling.
     * <p>
     * The new ajax function will add a header with the access token and a header to indicate
     * that it is an ajax request.
     * It will also catch authorisation failures and request a new access token.  If this fails, it will log the user
     * out.
     * @param existingAjax the original jQuery ajax function
     * @param logoutHandler a function to call when the user needs to be logged out
     * @returns the replacement jQuery ajax function
     * </p>
     */
    self.replaceAjax = function(existingAjax, logoutHandler) {
      var newAjax = function() {
        var jwt = self.getJWT();
        if (arguments && arguments.length > 0 && jwt) {
          // This function has the form ajax(settings) or ajax(url, settings) - support both.
          var settings = arguments.length === 1 ? arguments[0] : arguments[1];
          // Don't assume settings already has a headers field
          var headers = settings.headers || {};

          // Add the bearer token header
          headers.Authorization = "Bearer " + jwt;

          // Add header to indicate it's an Ajax request
          headers["X-Requested-With"] = "XMLHttpRequest";


          if (!settings.headers) {
            // Supports the case where we've just manufactured the only header
            settings.headers = headers;
          }
        }
        var args = arguments;
        var req = existingAjax.apply($, arguments);
        // Note that we need to use then() instead of fail(), so that the failure handler is able to provide a
        // replacement promise when it re-attempts the query after getting a new token.
        var promise = req.then(null, function(jqXHR) {
          if (jqXHR.status === 401 && loggingOut) {
            console.log("Couldn't get new access token - force re-login");
            logoutHandler();
          } else if (jqXHR.status === 401 && !loggingOut) {
            loggingOut = true;
            return self.sessionExpired()
            .then(function() {
              console.log("ajax: completed access token request");
              loggingOut = false;
              var jwt = self.getJWT();
              if (jwt) {
                args[0].headers.Authorization = "Bearer " + jwt;
              }
              // Repeat the request with updated bearer token
              return existingAjax.apply($, args);
            });
          } else {
            return jqXHR;
          }
        });
        promise.getResponseHeader = function() {
          // The jqXHR object that the jQuery ajax function returns has a getResponseHeader function as well as a
          // promise interface.
          console.log("Dummy getResponseHeader() called with arguments:", arguments);
        };
        return promise;
      };

      return newAjax;
    };

    /**
     * Force the user to re-login when a REST operation fails due to an expired JWT.
     */
    self.sessionExpired = function() {
      console.log("Got unauthorised (401) HTTP error - requesting new access token");
      var request = self.requestToken();
      return request
      .then(function(jwt) {
        console.log("Got new access token");
        var tenantName = self.getTenantName();
        var username = self.getUserName();
        self.setJWT(jwt, tenantName, username);
      });
    };

    /**
     * Get the JWT we have already - it may have expired - it may have just been made - just get what we can.
     * @param tenantName the JWT in storage needs to be associated with this tenant otherwise it's useless
     * @param queryArgs the resolved query args object
     * @returns {*}
     */
    self.getKnownJWT = function(tenantName, queryArgs) {

      // 1. Have we got a JWT in the query string (i.e. have we just logged in)?
      var jwt;
      if (queryArgs.token_type && queryArgs.token_type === 'Bearer') {
        jwt = queryArgs.access_token;
        self.setJWT(jwt, tenantName, queryArgs.username, queryArgs.expires_in);
        console.log('getKnownJWT: have JWT token in URL: ' + jwt);
        return jwt;
      }

      // 2. Have we got a (possibly older) JWT in local Web storage?
      var tenantOwningJWT;
      try {
        jwt = localStorage.getItem(jwtKey);
        tenantOwningJWT = localStorage.getItem(tenantOwningJWTKey);
      } catch (e) {
        jwt = jwtValue;
        tenantOwningJWT = tenantOwningJWTValue;
      }
      if (jwt && tenantOwningJWT && tenantOwningJWT === tenantName) {
        console.log("getKnownJWT: we have a JWT in local storage AND it's for this tenant");
        return jwt;
      }

      return null;
    };

    /**
     * Request a login page.
     * @param tenantName the name of the tenant (needed for authentication client_id).
     * @param appName the name of the app using the Auth MS (appears on login dialog if prompted).
     * @param authRequired Flag to indicate if auth is required (Y/N)
     * @param guestName Guest user name
     * @param retryCount the current value of retry count for this login sequence.
     * @param cloudAddress the URL for addressing the WSC cloud
     * @param authApiPath the path to the customer's own authentication rest api.
     */
    self.presentLogin = function(tenantName, appName, authRequired, guestName, retryCount,
                                 cloudAddress, authApiPath) {
      // generate a random number using JS Crypto API
      function getNonce() {
        var array = new Uint32Array(1);
        //noinspection JSUnresolvedVariable
        var cryptoObj = window.crypto || window.msCrypto; // for IE 11
        //noinspection JSUnresolvedFunction
        cryptoObj.getRandomValues(array);
        return array[0];
      }
      var guestLoginParam = "";
      if (authRequired === 'N') {
        guestLoginParam = '&auth=' + authRequired + "&name=" + guestName + '&cloud=' + cloudAddress;
        // if no authApiPath (the backend server auth address of the client) specified,
        // set it to the cloud auth address.
        if (!authApiPath) {
          authApiPath = cloudAddress + "/auth/authenticate";
        }
      } else {
        // not a guest login, must ignore authApiPath and always use the cloud auth address.
        authApiPath = cloudAddress + "/auth/authenticate";
      }

      var loginURL = authApiPath +
        '?client_id=' + tenantName +
        '&appName=' + appName +
        '&nonce=' + getNonce() +
        '&retryCount=' + retryCount +
        guestLoginParam +
        '&redirect_uri=' + decodeURIComponent(self.getQueryParams().originalTarget || location.href);
      console.log("Redirecting to: " + loginURL);
      // Suppress Open Redirect fortify defect
      // Suppress fortify defect id: FAFFAC062BAD7781C2B145E2BB30DA26
      // Suppress fortify defect id: FAFFAC062BAD7781C2B145E2BB30DA27
      // To be fixed in Jira task RC-1367
      window.location.replace(loginURL);
    };

  };

  return {
    authorization: new Authorization()
  };
}));
