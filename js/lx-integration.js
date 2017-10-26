/*
 * Copyright (c) 2017 Oracle. All rights reserved.
 *
 * This material is the confidential property of Oracle Corporation or its
 * licensors and may be used, reproduced, stored or transmitted only in
 * accordance with a valid Oracle license or sublicense agreement.
 */

/* globals cloud */

/*
 * This is the Live Experience integration library.
 * It is a 'UMD' which allows this file to be included as a require.js module or directly via a script tag.
 * The developer can access this module via the global namespace: 'lx'.
 * The application exports the 'integration' property.
 * For example:
 * A developer can use the 'lx.integration.loginToLiveExperience()' function to login to Live Experience.
 */
(function (root, factory) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(["auth"], factory);
  } else if (typeof module === "object" && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("auth"));
  } else {
    // Browser globals (root is window)
    //noinspection JSUndefinedPropertyAssignment
    root.lx = factory(root.auth);
  }
}(this, function (auth) {
  "use strict";

  /**
   * The Live Experience integration.
   * @constructor
   */
  var Integration = function() {
    var self = this;
    // static values
    self.defaultLXAddress = "https://ignite.oraclecloud.com";
    self.defaultTenant = "VivoAsto01";
    self.lxAddress = getLXAddress();
    self.tenant = getTenant();
    self.fullName = "A Customer";
    self.callMediaType = "video";
    // per-connection field
    self.username = getUsername();
    self.connection = null;
    // per-conversation fields
    self.conversation = null;
    self.avStream = null;
    self.remoteUri = null;
    self.callQueue = null;

    /**
     * Reset the state when the conversation has ended.
     */
    function reset() {
      self.conversation = null;
      self.avStream = null;
      self.remoteUri = null;
      self.callQueue = null;
      document.querySelector("#localVideo").style.display = "none";
      // document.querySelector("#localLabel").style.display = "none";
      document.querySelector("#remoteVideo").style.display = "none";
      document.querySelector("#remoteLabel").style.display = "none";
      document.querySelector(".start-video-call").disabled = false;
      document.querySelector("#endCallBtn").style.display = "none";
      document.querySelector("#resetBtn").style.display = "none";
      document.querySelector(".hold-call").style.display = "none";
      document.querySelector(".resume-call").style.display = "none";
    }

// =========================================================================================================
// exported functions...
// =========================================================================================================

    /**
     * Login to Live Experience.
     */
    self.loginToLiveExperience = function() {
      console.log("login: " + self.username);
      loginAndConnect()
        .then(function() {
          console.log("Connected with username: " + self.username + " and tenant: " + self.tenant);
          self.connection.initCallbacks(null, null, detectWhenConnectionHasFailed);
          sessionStorage.setItem("connectionId", self.connection.getConnectionId());
        })
        .catch(function(error) {
          console.error("Failed to connect", error);
        });
    };

    /**
     * Logout from Live Experience.
     */
    self.logoutFromLiveExperience = function() {
      if (self.connection) {
        console.log("logout: " + self.username);
        removeFromCallQueue(self.callMediaType, function() {console.log("success");});
        self.connection.close();
        self.connection = null;
        self.username = null;
        var connId = sessionStorage.getItem("connectionId");
        sessionStorage.removeItem(connId);
        sessionStorage.removeItem("connectionId");
      }
      auth.authorization.cleanSessionStorage();
      console.log("Reloading...");
      reset();
      document.location.reload();
    };

    /**
     * Start an audio/video call with an associate.
     */
    self.startTwoWayVideoCallWithAssociate = function() {
      console.log("Starting 2-way video call");
      var browserName = cloud.testBrowser().details.browserName;
      var browserVersion = cloud.testBrowser().details.browserVersion;
      var context = {
        "email" : self.username,
        "fullName" : self.fullName,
        "devType" : "Desktop",
        "devDesc": browserName,
        "osVersion": browserVersion,
        "behaviours": {
          "startInMedia": "AUDIO_VIDEO",
          "endUserCanInitiateVideoShare": "false",
          "endUserCanInitiateScreenShare": "false",
          "endUserVideoEnabled": "true",
          "endUserScreenShareEnabled": "false",
          "agentVideoEnabled": "true"
        }
      };
      createContext(context, function() {
        document.querySelector(".start-video-call").disabled = true;
        addToCallQueue(self.callMediaType, function(event) {
          startTwoWayVideo(event);
        });
      });
    };

    /**
     * End the call with the associate.
     */
    self.endCallWithAssociate = function() {
      if (self.conversation) {
        console.log("Ending call", self.conversation);
        self.conversation.end();
      } else {
        console.log("No call found to end");
        removeFromCallQueue(self.callMediaType, function() {console.log("success");});
      }
      reset();
    };

    /**
     * Hold the call.
     */
    self.holdCallWithAssociate = function() {
      if (self.conversation && self.avStream) {
        console.log("Attempting to hold call");
        var pause = new cloud.PauseResume(cloud.PAUSERESUME.PAUSE, cloud.PAUSERESUME.PAUSE,
          cloud.PAUSERESUMEREASON.PAUSE_RESUME);
        self.conversation.getParticipant(self.associateUri).getStreamInfos().forEach(function (stream) {
          stream.pauseResumeStream(pause, function () {
            console.log("Holding call");
            self.avStream.pauseResumeStream(pause, function () {
              console.log("Hold successful");
              // hide the 'hold' button, show the 'resume' button
              document.querySelector(".hold-call").style.display = "none";
              document.querySelector(".resume-call").style.display = "inline";
            }, function (reason) {
              console.log("Hold failed", reason);
            });
          });
        });
      }
    };

    /**
     * Resume the call.
     */
    self.resumeCallWithAssociate = function() {
      if (self.conversation && self.avStream) {
        console.log("Attempting to resume call");
        var pause = new cloud.PauseResume(cloud.PAUSERESUME.RESUME, cloud.PAUSERESUME.RESUME,
          cloud.PAUSERESUMEREASON.PAUSE_RESUME);
        self.conversation.getParticipant(self.associateUri).getStreamInfos().forEach(function (stream) {
          stream.pauseResumeStream(pause, function () {
            console.log("Resuming call");
            self.avStream.pauseResumeStream(pause, function () {
              console.log("Resume successful");
              // show the 'hold' button again, hide the 'resume' button
              document.querySelector(".hold-call").style.display = "inline";
              document.querySelector(".resume-call").style.display = "none";
            }, function (reason) {
              console.log("Resume failed", reason);
            });
          });
        });
      }
    };


// =========================================================================================================
// helper functions...
// =========================================================================================================

    /**
     * Login to Live Experience using implicit OAuth flow.
     */
    function loginAndConnect() {
      return new Promise(function(resolve, reject) {
        var secure = "N";
        if (auth.authorization.checkAuthorization(self.tenant, "Oracle Live Experience",
            secure, self.username, self.lxAddress)) {
          connect(resolve, reject);
        }
      });
    }

    /**
     * Add a caller to the queue - wait for associate address.
     * @param mediaType the media type (audio, video)
     * @param resolve the callback for when the call is answered.
     */
    function addToCallQueue(mediaType, resolve) {
      var pendingURI = self.lxAddress + "/assoc/api/SSE/tenant/" + self.tenant +
        "/conversation/pending?mediaType="+ mediaType + "&jwt="+ auth.authorization.getJWT();
      console.log("addToQueue: pendingURI: "+ pendingURI);
      //noinspection JSUnresolvedFunction
      self.callQueue = new EventSource(pendingURI);
      self.callQueue.addEventListener("Success", function(event) {
        console.log("addToCallQueue: success: ", event);
        self.callQueue.close();
        self.callQueue = null;
        resolve(event.data);
      }, false);
    }

    function removeFromCallQueue(mediaType, resolve) {
      var jwt = auth.authorization.getJWT();
      if (!jwt) {
        return;
      }
      var pendingURI = sessionStorage.getItem("CloudAddress") + "/assoc/api/tenant/" + self.tenant +
        "/conversation/pending?mediaType="+ mediaType + "&jwt="+ jwt;
      console.log("removeFromCallQueue: pendingURI: "+ pendingURI);
      var xhr = new XMLHttpRequest();
      xhr.open("DELETE", pendingURI, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + auth.authorization.getJWT());
      xhr.onload = function(e) {
        if (this.status === 200 || this.status === 204) {
          console.log("Got success for delete/pending", e);
          resolve();
        } else {
          console.log("Failed to delete pending call, Error: [" + this.status + "] " + e, xhr);
        }
        if (self.callQueue) {
          self.callQueue.close();
          self.callQueue = null;
        }
      };
      xhr.send();
    }

    /**
     * Create the context and post to SharedQueue.
     * @param context the context information JSON object.
     * @param resolve the callback to invoke on success.
     */
    function createContext(context, resolve){
      var contextURI = self.lxAddress + "/assoc/api/tenant/" +
        self.tenant + "/context";
      console.log("context: "+JSON.stringify(context, null, 2));

      var xhr = new XMLHttpRequest();
      xhr.open("POST", contextURI, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + auth.authorization.getJWT());
      xhr.onload = function(e) {
        if (this.status === 200 || this.status === 204) {
          console.log("Successfully set context info");
          resolve();
        } else  {
          console.error("Failed to set context info, Error: [" + this.status + "] ", e, xhr);
          if (xhr.responseText) {
            var response = JSON.parse(xhr.responseText);
            console.log(response);
          }
        }
      };
      xhr.send(JSON.stringify(context));
    }

    /**
     * Start a 2-way Video Call (SENDRECV).
     * @param associateUri the associate URI
     */
    function startTwoWayVideo(associateUri) {
      console.log("startTwoWayVideo with: " + associateUri);
      self.associateUri = associateUri;
      self.conversation = self.connection.makeConversation();
      var streamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.SENDRECV);
      startAudioVideoBundle(self.conversation, streamOptions, streamOptions, associateUri);
    }

    /**
     * Start the Audio+Video bundle with the specified stream options and remote participant.
     * @param {cloud.Conversation} conversation the current conversation.
     * @param {cloud.StreamOptions} localStreamOptions the local stream options.
     * @param {cloud.StreamOptions} remoteStreamOptions the remote stream options.
     * @param {string} participantUri the remote participant URI.
     */
    function startAudioVideoBundle(conversation, localStreamOptions, remoteStreamOptions, participantUri) {
      console.log("startAudioVideoBundle: participantUri=" + participantUri);
      self.remoteUri = participantUri;
      conversation.withParticipant(participantUri, remoteStreamOptions);

      self.avStream = conversation.createAudioVideoStream(localStreamOptions);
      self.avStream
        .withCallbacks(detectWhenStreamHasChangedState, makeAudioVideoStreamsLive,
          null, null, detectStreamPauseResumeRequest)
        .start();
    }

    /**
     * Callback invoked when a media event occurs (local or remote stream added or removed).
     * @param event the media event.
     * @param stream the stream added or removed.
     */
    function makeAudioVideoStreamsLive(event, stream) {
      var haveVideo = stream.getVideoTracks().length > 0;
      var remoteAudio, remoteVideo, localAudio, localVideo;
      switch (event) {
      case cloud.MEDIASTREAMEVENT.LOCAL_STREAM_ADDED:
        if (haveVideo) {
          // attach local video
          localVideo = document.querySelector("#localVideo");
          if (localVideo) {
            localVideo.srcObject = stream;
          }
          // show local video and label
          document.querySelector("#beginCallHeader").style.display = "none";
          document.querySelector("#inCallHeader").style.display = "inline-block";
          // document.querySelector("#localLabel").style.display = "inline-block";
          document.querySelector("#localVideo").style.display = "block";
        } else {
          // attach local audio
          localAudio = document.querySelector("#localAudio");
          if (localAudio) {
            localAudio.srcObject = stream;
          }
        }
        break;
      case cloud.MEDIASTREAMEVENT.LOCAL_STREAM_REMOVED:
        // detach local audio
        localAudio = document.querySelector("#localAudio");
        if (localAudio) {
          localAudio.srcObject = null;
        }
        // detach local video
        localVideo = document.querySelector("#localVideo");
        if (localVideo) {
          localVideo.srcObject = null;
        }
        // hide local video and label
        // document.querySelector("#localLabel").style.display = "none";
        document.querySelector("#localVideo").style.display = "none";
        break;
      case cloud.MEDIASTREAMEVENT.REMOTE_STREAM_ADDED:
        // attach remote video
        if (haveVideo) {
          remoteVideo = document.querySelector("#remoteVideo");
          if (remoteVideo) {
            remoteVideo.srcObject = stream;
          }
          //show remote video and label
          document.querySelector("#remoteLabel").style.display = "inline-block";
          document.querySelector("#remoteVideo").style.display = "block";
        } else {
          // attach remote audio
          remoteAudio = document.querySelector("#remoteAudio");
          if (remoteAudio) {
            remoteAudio.srcObject = stream;
          }
        }
        break;
      case cloud.MEDIASTREAMEVENT.REMOTE_STREAM_REMOVED:
        // detach remote video
        if (haveVideo) {
          remoteVideo = document.querySelector("#remoteVideo");
          if (remoteVideo) {
            remoteVideo.srcObject = null;
          }
          // hide remote video and label
          document.querySelector("#remoteLabel").style.display = "none";
          document.querySelector("#remoteVideo").style.display = "none";
        } else {
          // detach remote audio
          remoteAudio = document.querySelector("#remoteAudio");
          if (remoteAudio) {
            remoteAudio.srcObject = null;
          }
        }
        break;
      default:
        break;
      }
    }


// =========================================================================================================
// callback functions...
// =========================================================================================================

    /**
     * Callback invoked when the state of the AV stream changes.
     * @param streamState the new state.
     */
    function detectWhenStreamHasChangedState(streamState) {
      console.log("detectWhenStreamHasEnded: streamState=" + JSON.stringify(streamState, null, 2), self.avStream);
      var status = streamState.state;
      switch (status) {
      case cloud.STREAMSTATE.ESTABLISHED:
        document.querySelector(".start-video-call").disabled = true;
        document.querySelector("#endCallBtn").style.display = "inline-block";
        document.querySelector("#resetBtn").style.display = "inline-block";
        document.querySelector(".hold-call").style.display = "inline-block";
        break;
      case cloud.STREAMSTATE.FAILED:
        document.querySelector("#streamFailed").style.display = "inline-block";
      case cloud.STREAMSTATE.ENDED:
      // Custom CSS Changes for client side webpage
        //document.querySelector("#remoteTerminated").style.display = "block";
        document.querySelector("#endCallHeader").style.display = "inline-block";
        document.querySelector("#inCallHeader").style.display = "none";
        document.querySelector("#localStreamContent").style.display = "none";
        document.querySelector("#remoteStreamContent").style.display = "none";
      // End Custom CSS Changes
        self.avStream = null;
        reset();
        break;
      default:
        break;
      }
    }

    /**
     * Callback invoked when a request to pause or resume the AV stream is received.
     * @param conversation the current conversation
     * @param avStream the current AV stream
     * @param streamRequest the request to pause or resume the stream.
     * @param pauseResume the pause/resume request (reason, audio/video: pause/resume)
     */
    function detectStreamPauseResumeRequest(conversation, avStream, streamRequest, pauseResume) {
      var isPauseResume = pauseResume.reason === cloud.PAUSERESUMEREASON.PAUSE_RESUME;
      var isPause = pauseResume.audio === cloud.PAUSERESUME.PAUSE && pauseResume.video === cloud.PAUSERESUME.PAUSE;
      console.log("detectStreamPauseResumeRequest: reason=" + pauseResume.reason + ", isPause=" + isPause);
      if (isPauseResume) {
        // stream has been paused/resumed by the associate
        streamRequest.accept();
        avStream.pauseResumeStream(pauseResume);
        if (isPause) {
          document.querySelector(".hold-call").disabled = true;
          document.querySelector(".resume-call").disabled = true;
        } else {
          document.querySelector(".hold-call").disabled = false;
          document.querySelector(".resume-call").disabled = false;
        }
      } else {
        // associate is requesting that end-user add/remove video - which the sample does not support yet.
        streamRequest.decline();
      }
    }

    /**
     * Callback invoked when the connection state changes (such as when it fails).
     * @param state the new connection state.
     */
    function detectWhenConnectionHasFailed(state) {
      console.log("detectWhenConnectionHasFailed: state=" + state);
      switch (state) {
      case cloud.CONNECTIONSTATE.FAILED:
        console.error("Failed to connect to server");
        //show connection failed Error in browser
        document.querySelector("#connectionError").style.display = "inline-block";
        sessionStorage.removeItem("connectionId");
        break;
      default:
        break;
      }
    }


// =====================================================================
// additional internal functions...
// =====================================================================

    // generate a random number using JS Crypto API
    function generateShortCode() {
      // To avoid confusion, exclude O, 0, I and 1
      var CCID_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      var shortCodeLength = 6;
      var min = Math.ceil(1), max = Math.floor(CCID_CHARS.length);
      var cryptoObj = window.crypto || window.msCrypto;

      var shortCode = "";
      for (var n = 0; n < shortCodeLength; n++) {
        // generate a secure random number in range
        var randomBuffer = new Uint32Array(1);
        cryptoObj.getRandomValues(randomBuffer);
        var randomNumber = randomBuffer[0] / (0xffffffff + 1);
        var sequence = Math.floor(randomNumber * (max - min + 1)) + min;
        // select a character from CCID range
        shortCode += (CCID_CHARS[sequence - 1]);
      }
      console.log("Generated short-code: " + shortCode);
      return shortCode;
    }

    /**
     * Connect to Live Experience.
     * @param resolve method to call when connection is valid.
     * @param reject method to call when connection fails.
     */
    function connect(resolve, reject) {
      if (!(self.username && self.username !== "" && self.username.indexOf("@") > 0)) {
        console.log("Invalid username: " + self.username);
        //show connection failed Error in browser
        document.querySelector("#invalidUser").style.display = "inline-block";
        self.logoutFromLiveExperience();
        return;
      }
      var connectionId = sessionStorage.getItem("connectionId");
      if (connectionId) {
        console.log("Reconnecting to existing session: " + connectionId);
      }
      console.log("Logged in with username: '" + self.username + "', tenant: '" + self.tenant + "'");
      var wsUri = self.lxAddress.replace(/^http/, "ws") + "/ws/webrtc/cloud";
      wsUri += "?jwt=" + auth.authorization.getJWT() + "&tenant_profile_key=" + self.tenant;
      self.connection = new cloud.Connection(self.username, wsUri, resolve, reject)
        .withConnectionId(connectionId)
        .start();
      self.connection.setTrickleIceMode("full");
      console.log("Starting connection: wsUri=" + wsUri, self.connection);
    }

    /**
     * Extract the address of the Live Experience service, if provided as a query parameter.
     * @returns {string} the Live Experience service address.
     */
    function getLXAddress() {
      // Get the LX service address - from either the last session or (preferably) this URL
      var lxAddress = sessionStorage.getItem("LXAddress");
      console.log("LX URL from previous use=" + lxAddress);

      var hashArgs = auth.authorization.getQueryArguments();
      if (hashArgs.service) {
        lxAddress = hashArgs.service;
        console.log("LX URL obtained from # args=" + lxAddress);
      } else {
        var searchArgs = auth.authorization.getQueryParams();
        if (searchArgs.service) {
          lxAddress = searchArgs.service;
          console.log("LX URL obtained from ? args=" + lxAddress);
        }
      }
      if (!lxAddress) {
        // use the default Live Experience address
        lxAddress = self.defaultLXAddress;
      }
      console.log("Saving LX URL='" + lxAddress + "'");
      sessionStorage.setItem("LXAddress", lxAddress);
      return lxAddress;
    }

    /**
     * Extract the tenant name if provided as a query parameter.
     * @returns {string} the tenant name.
     */
    function getTenant() {
      // Get the LX service address - from either the last session or (preferably) this URL
      var tenant = sessionStorage.getItem("Tenant");
      console.log("Tenant from previous use=" + tenant);
      var LXUserName = sessionStorage.getItem("username");
      console.log("Tenant from previous use=" + tenant);
      var hashArgs = auth.authorization.getQueryArguments();
      if (hashArgs.tenant) {
        tenant = hashArgs.tenant;
        console.log("Tenant obtained from # args=" + tenant);
      } else {
        var searchArgs = auth.authorization.getQueryParams();
        if (searchArgs.tenant) {
          tenant = searchArgs.tenant;
          console.log("Tenant obtained from ? args=" + tenant);
        }
      }
      if (!tenant) {
        // use the default Tenant name
        tenant = self.defaultTenant;
      }
      console.log("Saving Tenant='" + tenant + "'");
      sessionStorage.setItem("Tenant", tenant);
      return tenant;
    }


    /**
      * GetUsername script
    */
    function getUsername() {
      var username = sessionStorage.getItem("Username");
      if (!username) {
        username = "customer-" + generateShortCode() + "@example.com";
        sessionStorage.setItem("Username", username);
    }
      return username;
    }

  }; //End-of-Integration

  /*
   * Export an instance of the lx-integration via the 'integration' variable.
   */
  return {
    integration: new Integration()
  };
}));
