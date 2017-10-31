/*
 * Copyright (c) 2017 Oracle. All rights reserved.
 *
 * This material is the confidential property of Oracle Corporation or its
 * licensors and may be used, reproduced, stored or transmitted only in
 * accordance with a valid Oracle license or sublicense agreement.
 */

/* globals cloud */

/*
 * This is the Live Experience library.
 * Developer Note: uses es6 classes and arrow functions
 */
define(["jquery", "text!lx.html", "css!lx.css", "cloud"], function ($, html) {
  "use strict";

  /**
   * Live Experience Service configuration.
   * @class
   * @see Controller
   * @example
   * lx.controller.service.userID = "my.user@example.com";
   * lx.controller.service.tenantID = "MyTenant";
   * lx.controller.service.authToken = myAuthToken;
   */
  class Service {
    /**
     * @constructor
     */
    constructor() {
      this._address = "ignite.oraclecloud.com";
      this._userID = "";
      this._authToken = "";
      this._tenantID = "";
    }

    /**
     * Set the address.
     * @param {string} addr the address
     * @private
     */
    set address(addr) {
      this._address = addr;
    }

    /**
     * Get the address value.
     * @method
     * @returns {string} the address
     */
    get address() {
      return this._address;
    }

    /**
     * Set the UserID (the caller"s email address).
     * @method
     * @param {string} uid the user id.
     */
    set userID(uid) {
      this._userID = uid;
    }

    /**
     * Get the UserID (the caller"s email address).
     * @method
     * @returns {string}
     */
    get userID() {
      return this._userID;
    }

    /**
     * Set the Tenant ID.
     * @method
     * @param {string} tenant the tenant identifier
     */
    set tenantID(tenant) {
      this._tenantID = tenant;
    }

    /**
     * Get the Tenant ID.
     * @method
     * @returns {string} the tenant ID.
     */
    get tenantID() {
      return this._tenantID;
    }

    /**
     * Set the authentication token (JWT) retrieved from Live Experience auth service.
     * @method
     * @param {string} token the auth token.
     */
    set authToken(token) {
      this._authToken = token;
    }

    /**
     * Get the authentication token (JWT).
     * @method
     * @returns {string} the auth token.
     */
    get authToken() {
      return this._authToken;
    }

    /**
     * Checks whether the service configuration is valid.
     * @private
     * @returns {boolean} true if the config is valid.
     */
    isValid() {
      return (this._authToken !== null && this._authToken !== "" &&
        this._userID !== null && this._userID !== "" &&
        this._tenantID !== null && this._tenantID !== "" &&
        this._address !== null && this._address !== "");
    }
  } //End-of-Service

  /**
   * Context attributes used by Live Experience component.
   * Additional (internal) context attributes are added by the component, such as devType, devDesc, osVersion.
   * "appLocation" is used in the default engagement scenarios and should be provided with a value.
   * <br/>
   * The default engagement scenario "appLocation" values are:
   * "Basic Guidance", "Remote Support", "Collaboration", "Personal Shopper", "Concierge", "Short Code"
   * Added by CMH "Medical Appointment"
   *
   * @class
   * @see Controller
   * @example
   * // required context attributes:
   * lx.controller.contextAttributes.set("appLocation", "Medical Appointment");
   * // optional context attributes:
   * lx.controller.contextAttributes.set("fullName", "John Smith");
   * lx.controller.contextAttributes.set("email", "john.smith@example.com");
   * lx.controller.contextAttributes.set("phone", "+1-202-555-0171");
   * lx.controller.contextAttributes.set("location", "San Francisco CA, United States");
   */
  class ContextAttributes {
    /**
     * @constructor
     */
    constructor() {
      this._entries = new Map();
    }

    /**
     * Set the context attribute key to a value.
     * @method
     * @param {string} key the context key.
     * @param {string} value the context value.
     */
    set(key, value) {
      this._entries.set(key, value);
    }

    /**
     * Get the context attribute value for the given key.
     * @method
     * @param {string} key the context key.
     * @returns {string} the context value.
     */
    get(key) {
      return this._entries.get(key);
    }

    /**
     * Remove all of the context attributes.
     * @method
     */
    removeAll() {
      this._entries.clear();
    }

    /**
     * Check whether the context attributes are valid.
     * @method
     * @private
     * @returns {boolean} true if the context attributes are valid.
     */
    isValid() {
      return this._entries.size > 0;
    }

    /**
     * Convert the context attributes to a JSON object string.
     * @method
     * @returns {string} the JSON string
     */
    toJSON() {
      let obj = Object.create(null);
      for (let [k, v] of this._entries) {
        obj[k] = v;
      }
      return JSON.stringify(obj);
    }
  } //End-of-ContextAttributes

  /**
   * Live Experience controller.
   * Entry point into the Live Experience web component.
   * @class
   * @see Service
   * @see ContextAttributes
   * @example
   * lx.controller.addComponent("#lx-integration");
   */
  class Controller {
    /**
     * @constructor
     */
    constructor() {
      // external properties
      /** @member {Service} */
      this.service = new Service();
      /** @member {ContextAttributes} */
      this.contextAttributes = new ContextAttributes();
      // internal properties
      // per-connection field
      this._fullName = "A Customer";
      this._callMediaType = "video";
      this._connection = null;
      // per-conversation fields
      this._conversation = null;
      this._avStream = null;
      this._associateUri = null;
      this._callQueue = null;
    }

    /**
     * Add the component to the page.
     * Invoked after the web-component library has been loaded and the configuration has been set.
     * @method
     * @param {string} rootTag the root tag where the live-experience web component will be attached
     */
    addComponent(rootTag) {
      if (!rootTag || typeof rootTag !== "string") {
        throw "Invalid rootTag - must be a string";
      }
      console.log("Loading LX template");
      $(html).appendTo(rootTag);
      // setup the click handlers
      $(".lx-start-call").off("click").click(() => {
        this.startCallWithAssociate();
      });
      $(".lx-end-call").off("click").click(() => {
        this.endCallWithAssociate();
      });
      $(".lx-hold-call").off("click").click(() => {
        this.holdCallWithAssociate();
      });
      $(".lx-resume-call").off("click").click(() => {
        this.resumeCallWithAssociate();
      });
      $(".lx-reset").off("click").click(() => {
        this.logoutFromLiveExperience();
        this.loginToLiveExperience();
      });
    // This function is not working, video gets added to local side, but not on Associate side.
      $(".lx-add-video").off("click").click(() => {
        this.startTwoWayVideo();
      });
    // This function is not working, need to loo at how to downgrade Video to Audio Only
      $(".lx-audio-only").off("click").click(() => {
        this.startAssociateToUserVideo();
      });

      if (this.service.isValid() && this.contextAttributes.isValid()) {
        // login then show component
        this.loginToLiveExperience();
      } else {
        throw "Invalid configuration";
      }
    }

    /**
     * Reset the state when the conversation has ended.
     * @private
     */
    reset() {
      this._conversation = null;
      this._avStream = null;
      this._associateUri = null;
      this._callQueue = null;
      document.querySelector(".lx-local-video").style.display = "none";
      document.querySelector(".lx-remote-video").style.display = "none";
      document.querySelector(".lx-start-call").disabled = false;
    }

    // =========================================================================================================
    // exported functions...
    // =========================================================================================================

    /**
     * Login to Live Experience.
     * @private
     */
    loginToLiveExperience() {
      console.log("login: " + this.service.userID);
      this.loginAndConnect()
        .then(() => {
          console.log("Connected with username: " + this.service.userID + " and tenant: " + this.service.tenantID);
          this._connection.initCallbacks(null, null, this.detectWhenConnectionHasFailed);
          sessionStorage.setItem("connectionId", this._connection.getConnectionId());
        })
        .catch((error) => {
          console.error("Failed to connect", error);
        });
    }

    /**
     * Logout from Live Experience.
     * @private
     */
    logoutFromLiveExperience() {
      if (this._connection) {
        console.log("logout: " + this.service.userID);
        this.removeFromCallQueue(this._callMediaType, () => {
          console.log("success");
        });
        this._connection.close();
        this._connection = null;
      }
      sessionStorage.removeItem(sessionStorage.getItem("connectionId"));
      sessionStorage.removeItem("connectionId");
      console.log("Reloading...");
      this.reset();
      // document.location.reload();
    }

    /**
     * Start a call with an associate.
     * @private
     */
    startCallWithAssociate() {
      console.log("Starting call");
      this.populateContext();
      this.getMetaScenario(() => {
        this.sendContext(() => {
          document.querySelector(".lx-start-call").disabled = true;
          this.addToCallQueue(this._callMediaType, (address) => {
            this.startCall(address);
          });
        });
      });
    }

    /**
     * End the call with the associate.
     * @private
     */
    endCallWithAssociate() {
      if (this._conversation) {
        console.log("Ending call", this._conversation);
        this._conversation.end();
      } else {
        console.log("No call found to end");
        this.removeFromCallQueue(this._callMediaType, () => {
          console.log("success");
        });
      }
      this.reset();
    }

    /**
     * Hold the call.
     * @private
     */
    holdCallWithAssociate() {
      if (this._conversation && this._avStream) {
        console.log("Attempting to hold call");
        let pause = new cloud.PauseResume(cloud.PAUSERESUME.PAUSE, cloud.PAUSERESUME.PAUSE,
          cloud.PAUSERESUMEREASON.PAUSE_RESUME);
        this._conversation.getParticipant(this._associateUri).getStreamInfos().forEach((stream) => {
          stream.pauseResumeStream(pause, () => {
            console.log("Holding call");
            this._avStream.pauseResumeStream(pause, () => {
              console.log("Hold successful");
              // hide the "hold" button, show the "resume" button
              document.querySelector(".lx-hold-call").style.display = "none";
              document.querySelector(".lx-resume-call").style.display = "inline";
            }, (reason) => {
              console.log("Hold failed", reason);
            });
          });
        });
      }
    }

    /**
     * Resume the call.
     * @private
     */
    resumeCallWithAssociate() {
      if (this._conversation && this._avStream) {
        console.log("Attempting to resume call");
        let pause = new cloud.PauseResume(cloud.PAUSERESUME.RESUME, cloud.PAUSERESUME.RESUME,
          cloud.PAUSERESUMEREASON.PAUSE_RESUME);
        this._conversation.getParticipant(this._associateUri).getStreamInfos().forEach((stream) => {
          stream.pauseResumeStream(pause, () => {
            console.log("Resuming call");
            this._avStream.pauseResumeStream(pause, () => {
              console.log("Resume successful");
              // show the "hold" button again, hide the "resume" button
              document.querySelector(".lx-hold-call").style.display = "inline";
              document.querySelector(".lx-resume-call").style.display = "none";
            }, (reason) => {
              console.log("Resume failed", reason);
            });
          });
        });
      }
    }


    // =========================================================================================================
    // helper functions...
    // =========================================================================================================

    /**
     * Populate the context attributes with 'device info'.
     * @method
     * @private
     */
    populateContext() {
      let userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera,
        platform = window.navigator.platform,
        macosPlatforms = ["Macintosh", "MacIntel"],
        windowsPlatforms = ["Win32", "Win64", "Windows"],
        iosPlatforms = ["iPhone", "iPad", "iPod"],
        androidPlatforms = ["Android"],
        os = null;

      if (macosPlatforms.indexOf(platform) !== -1) {
        os = "macOS";
      } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = "iOS";
      } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = "Windows";
      } else if (androidPlatforms.indexOf(platform) !== -1) {
        os = "Android";
      }
      if (!os && /android/i.test(userAgent)) {
        os = "Android";
      } else if (!os && /linux/i.test(platform)) {
        os = "Linux";
      }
      let browserName = cloud.testBrowser().details.browserName;
      let browserVersion = "" + cloud.testBrowser().details.browserVersion;
      console.log("populateContext: os=" + os + ", browserName=" + browserName + ", browserVersion=" + browserVersion);
      this.contextAttributes.set("devType", "Web (" + os + ")");
      this.contextAttributes.set("devDesc", browserName);
      this.contextAttributes.set("osVersion", browserVersion);
    }

    /**
     * Login to Live Experience using implicit OAuth flow.
     * @private
     * @returns {Promise} a promise
     */
    loginAndConnect() {
      return new Promise((resolve, reject) => {
        this.connectToLiveExperience(resolve, reject);
      });
    }

    /**
     * Add a caller to the queue - wait for associate address.
     * @param {string} mediaType the media type (audio, video)
     * @param {function} resolve the callback for when the call is answered.
     * @private
     */
    addToCallQueue(mediaType, resolve) {
      let jwt = this.service.authToken;
      let pendingURI = this.service.address + "/assoc/api/SSE/tenant/" + this.service.tenantID +
        "/conversation/pending?mediaType=" + mediaType + "&jwt=" + jwt;
      console.log("addToQueue: pendingURI: " + pendingURI);
      //noinspection JSUnresolvedFunction
      this._callQueue = new EventSource(pendingURI);
      this._callQueue.addEventListener("Success", (event) => {
        console.log("addToCallQueue: success: address=" + event.data, event);
        if (this._callQueue) {
          this._callQueue.close();
          this._callQueue = null;
        }
        resolve(event.data);
      }, false);
    }

    /**
     * Remove the caller from the queue.
     * @param {string} mediaType the media type (audio, video)
     * @param {function} resolve the callback for when the caller has been removed.
     * @private
     */
    removeFromCallQueue(mediaType, resolve) {
      let jwt = this.service.authToken;
      let pendingURI = this.service.address + "/assoc/api/tenant/" + this.service.tenantID +
        "/conversation/pending?mediaType=" + mediaType + "&jwt=" + jwt;
      console.log("removeFromCallQueue: pendingURI: " + pendingURI);
      let xhr = new XMLHttpRequest();
      xhr.open("DELETE", pendingURI, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + jwt);
      xhr.onload = (e) => {
        if (xhr.status === 200 || xhr.status === 204) {
          console.log("Got success for delete/pending", e);
          resolve();
        } else {
          console.log("Failed to delete pending call, Error: [" + xhr.status + "] " + e, xhr);
        }
        if (this._callQueue) {
          this._callQueue.close();
          this._callQueue = null;
        }
      };
      xhr.send();
    }
// This is the section that is pulling down scenario based off of contect. NEED TO LOOK AT PULLING BASIC GUIDANCE
// and AUDIO_ONLY
    /**
     * Get the meta scenario based on the context.
     * @param {function} resolve the callback for when the context has been retrieved.
     * @private
     */
    getMetaScenario(resolve) {
      let jwt = this.service.authToken;
      let scenarioURI = this.service.address + "/tenant/api/tenants/" + this.service.tenantID +
        "/match-meta-scenario";
      let context = this.contextAttributes.toJSON();
      console.log("getMetaScenario for context: " + context);
      let xhr = new XMLHttpRequest();
      xhr.open("POST", scenarioURI, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + jwt);
      xhr.onload = (e) => {
        if (xhr.status === 200) {
          console.log("Got success for post/match-meta-scenario: \n" + xhr.responseText);
          console.log("Pending URI: \n" + scenarioURI);
          if (xhr.responseText) {
            let config = JSON.parse(xhr.responseText);
            console.log("Configuration: ", config.Configuration);
            let behaviours = config.Configuration.behaviours;
            let messages = config.Configuration.messages;
            console.log("Configuration.behaviours: ", behaviours);
            console.log("Configuration.messages: ", messages);
            this.contextAttributes.set("behaviours", behaviours);
            console.log("Stored behaviours: " + JSON.stringify(this.contextAttributes.get("behaviours"), null, 2));
            this.contextAttributes.set("messages", messages);
            console.log("Stored messages: " + JSON.stringify(this.contextAttributes.get("messages"), null, 2));
            resolve();
          } else {
            console.error("Failed to match meta scenario (no response text), Error: [" + xhr.status + "] ", xhr);
          }
        } else {
          console.error("Failed to match meta scenario, Error: [" + xhr.status + "] ", e, xhr);
          if (xhr.responseText) {
            let response = JSON.parse(xhr.responseText);
            console.log(response);
          }
        }
      };
      xhr.send(context);
    }

    /**
     * Send the context to the SharedQueue.
     * @method
     * @param {function} resolve the callback to invoke on success.
     * @private
     */
    sendContext(resolve) {
      let jwt = this.service.authToken;
      let contextURI = this.service.address + "/assoc/api/tenant/" +
        this.service.tenantID + "/context";
      let context = this.contextAttributes.toJSON();
      console.log("sendContext: " + context);

      let xhr = new XMLHttpRequest();
      xhr.open("POST", contextURI, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + jwt);
      xhr.onload = (e) => {
        if (xhr.status === 200 || xhr.status === 204) {
          console.log("Successfully sent context info");
          resolve();
        } else {
          console.error("Failed to send context info, Error: [" + xhr.status + "] ", e, xhr);
          if (xhr.responseText) {
            let response = JSON.parse(xhr.responseText);
            console.log(response);
          }
        }
      };
      xhr.send(context);
    }

    /*
    TODO: Possible behaviour values:
    ================================
    endUserInitialMedia: NONE, AUDIO_ONLY, AUDIO_VIDEO, SCREEN_SHARE
    associateInitialMedia: NONE, AUDIO_ONLY, AUDIO_VIDEO, SCREEN_SHARE
    endUserCanAddAudio: true/false
    endUserCanAddVideo: true/false
    endUserCanAddScreenShare: true/false
    associateCanRequestEndUserAudio: true/false
    associateCanRequestEndUserVideo: true/false
    associateCanRequestEndUserScreenShare: true/false
    associateCanAddAudio: true/false
    associateCanAddVideo: true/false
    associateCanAddScreenShare: true/false
    */

    /**
     * Start a call with the associate.
     * @param {string} associateUri the associate URI
     * @private
     */
    startCall(associateUri) {
      console.log("startCall with: " + associateUri);
      this._associateUri = associateUri;
      this._conversation = this._connection.makeConversation();
      let behaviours = this.contextAttributes.get("behaviours");
      let endUserInitialMedia = behaviours.endUserInitialMedia,
        associateInitialMedia = behaviours.associateInitialMedia;
      console.log("Behaviors Value: \n" + behaviours);
      console.log("startCall: endUserInitialMedia=" + endUserInitialMedia +
                  ", associateInitialMedia=" + associateInitialMedia);
      //TODO: Note only 'basic guidance' (2-way audio) is supported
      //Audio Only Initiation
      if (endUserInitialMedia === "AUDIO_ONLY" && associateInitialMedia === "AUDIO_ONLY") {
        this.startTwoWayAudio();
      }
      // Video Both Party Initiation
      else if (endUserInitialMedia === "AUDIO_VIDEO" && associateInitialMedia === "AUDIO_VIDEO") {
        this.startTwoWayVideo();
      }
      // Associate=Video / User=Audio Initiation
      else if (endUserInitialMedia === "AUDIO_ONLY" && associateInitialMedia === "AUDIO_VIDEO") {
        this.startAssociateToUserVideo();
      }
      // Associate=Audio User=Video Initiation
      else if (endUserInitialMedia === "AUDIO_VIDEO" && associateInitialMedia === "AUDIO_ONLY") {
        this.startUserToAssociateVideo();
      } else {
        throw "Unsupported behaviours in engagement scenario, only audio and video is supported";
      }
    }

    /**
     * Start a 2-way Video Call (video=SENDRECV).
     * @private
     */
    startTwoWayVideo() {
      console.log("startTwoWayVideo");
      let streamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.SENDRECV);
      // noinspection JSCheckFunctionSignatures
      this.startAudioVideoBundle(this._conversation, streamOptions, streamOptions);
    }

    /**
     * Start a 2-way Audio Call (video=NONE).
     * @private
     */
    startTwoWayAudio() {
      console.log("startTwoWayAudio");
      let streamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.INACTIVE);
      // noinspection JSCheckFunctionSignatures
      this.startAudioVideoBundle(this._conversation, streamOptions, streamOptions);
    }

    /**
     * Start a 1-way Video Call (user=SENDONLY, assoc=RECVONLY).
     * @private
     */
    startUserToAssociateVideo() {
      console.log("startUserToAssociateVideo");
      let localStreamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.SENDONLY);
      let remoteStreamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.RECVONLY);
      // noinspection JSCheckFunctionSignatures
      this.startAudioVideoBundle(this._conversation, localStreamOptions, remoteStreamOptions);
    }

    /**
     * Start a 1-way Video Call (user=RECVONLY, assoc=SENDONLY).
     * @private
     */
    startAssociateToUserVideo() {
      console.log("startAssociateToUserVideo");
      let localStreamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.RECVONLY);
      let remoteStreamOptions = cloud.StreamInfo.createStreamOptions(
        //audio direction is normally always SENDRECV
        cloud.MEDIADIRECTION.SENDRECV,
        //video direction can be: INACTIVE, RECVONLY, SENDONLY, SENDRECV
        cloud.MEDIADIRECTION.SENDONLY);
      // noinspection JSCheckFunctionSignatures
      this.startAudioVideoBundle(this._conversation, localStreamOptions, remoteStreamOptions);
    }

    /**
     * Start the Audio+Video bundle with the specified stream options and remote participant.
     * @param {cloud.Conversation} conversation the current conversation.
     * @param {cloud.StreamOptions} localStreamOptions the local stream options.
     * @param {cloud.StreamOptions} remoteStreamOptions the remote stream options.
     * @private
     */
    startAudioVideoBundle(conversation, localStreamOptions, remoteStreamOptions) {
      console.log("startAudioVideoBundle: associateUri=" + this._associateUri);
      // noinspection JSUnresolvedFunction
      conversation.withParticipant(this._associateUri, remoteStreamOptions);

      // noinspection JSUnresolvedFunction
      this._avStream = conversation.createAudioVideoStream(localStreamOptions);
      this._avStream
        .withCallbacks(this.detectWhenStreamHasChangedState, this.makeAudioVideoStreamsLive,
          null, null, this.detectStreamPauseResumeRequest)
        .start();
    }

    /**
     * Callback invoked when a media event occurs (local or remote stream added or removed).
     * @param {string} event the media event.
     * @param {MediaStream} stream the stream added or removed.
     * @private
     */
    makeAudioVideoStreamsLive(event, stream) {
      let haveVideo = stream.getVideoTracks().length > 0;
      let remoteAudio, remoteVideo, localAudio, localVideo;
      switch (event) {
      case cloud.MEDIASTREAMEVENT.LOCAL_STREAM_ADDED:
        if (haveVideo) {
          // attach local video
          localVideo = document.querySelector(".lx-local-video");
          if (localVideo) {
            localVideo.srcObject = stream;
          }
          // show local video and label
          document.querySelector("#beginCallHeader").style.display = "none";
          document.querySelector("#inCallHeader").style.display = "inline-block";
          document.querySelector("#localLabel").style.display = "inline-block";
          document.querySelector(".lx-local-video").style.display = "inline-block";
        } else {
          // attach local audio
          localAudio = document.querySelector(".lx-local-audio");
          if (localAudio) {
            localAudio.srcObject = stream;
          }
        }
        break;
      case cloud.MEDIASTREAMEVENT.LOCAL_STREAM_REMOVED:
        // detach local audio
        localAudio = document.querySelector(".lx-local-audio");
        if (localAudio) {
          localAudio.srcObject = null;
        }
        // detach local video
        localVideo = document.querySelector(".lx-local-video");
        if (localVideo) {
          localVideo.srcObject = null;
        }
        // hide local video
        document.querySelector(".lx-local-video").style.display = "none";
        break;
      case cloud.MEDIASTREAMEVENT.REMOTE_STREAM_ADDED:
        // attach remote video
        if (haveVideo) {
          remoteVideo = document.querySelector(".lx-remote-video");
          if (remoteVideo) {
            remoteVideo.srcObject = stream;
          }
          //show remote video and label
          document.querySelector("#remoteLabel").style.display = "inline-block";
          document.querySelector(".lx-remote-video").style.display = "inline-block";

        } else {
          // attach remote audio
          remoteAudio = document.querySelector(".lx-remote-audio");
          if (remoteAudio) {
            remoteAudio.srcObject = stream;
          }
        }
        break;
      case cloud.MEDIASTREAMEVENT.REMOTE_STREAM_REMOVED:
        // detach remote video
        if (haveVideo) {
          remoteVideo = document.querySelector(".lx-remote-video");
          if (remoteVideo) {
            remoteVideo.srcObject = null;
          }
          // hide remote video
          document.querySelector(".lx-remote-video").style.display = "none";
        } else {
          // detach remote audio
          remoteAudio = document.querySelector(".lx-remote-audio");
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
     * @param {cloud.StreamState} streamState the new state.
     * @private
     */
    detectWhenStreamHasChangedState(streamState) {
      console.log("detectWhenStreamHasChangedState: streamState=" + JSON.stringify(streamState, null, 2),
        this._avStream);
      let status = streamState.state;
      switch (status) {
      case cloud.STREAMSTATE.ESTABLISHED:
        document.querySelector(".lx-start-call").disabled = true;
        document.querySelector(".lx-end-call").style.display = "inline-block";
        document.querySelector(".lx-hold-call").style.display = "inline-block";
        //document.querySelector(".lx-reset").style.display = "inline-block";
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
        this._avStream = null;
        this.reset();
        break;
      default:
        break;
      }
    }

    /**
     * Callback invoked when a request to pause or resume the AV stream is received.
     * @param {cloud.Conversation} conversation the current conversation
     * @param {cloud.AudioVideoStream} avStream the current AV stream
     * @param {cloud.StreamRequest} streamRequest the request to pause or resume the stream.
     * @param {cloud.PauseResume} pauseResume the pause/resume request (reason, audio/video: pause/resume)
     * @private
     */
    detectStreamPauseResumeRequest(conversation, avStream, streamRequest, pauseResume) {
      let isPauseResume = pauseResume.reason === cloud.PAUSERESUMEREASON.PAUSE_RESUME;
      let isPause = pauseResume.audio === cloud.PAUSERESUME.PAUSE && pauseResume.video === cloud.PAUSERESUME.PAUSE;
      console.log("detectStreamPauseResumeRequest: reason=" + pauseResume.reason + ", isPause=" + isPause);
      if (isPauseResume) {
        // stream has been paused/resumed by the associate
        streamRequest.accept();
        avStream.pauseResumeStream(pauseResume);
        if (isPause) {
          document.querySelector(".lx-hold-call").disabled = true;
          document.querySelector(".lx-resume-call").disabled = true;
        } else {
          document.querySelector(".lx-hold-call").disabled = false;
          document.querySelector(".lx-resume-call").disabled = false;
        }
      } else {
        // associate is requesting that end-user add/remove video - which the sample does not support yet.
        streamRequest.decline();
      }
    }

    /**
     * Callback invoked when the connection state changes (such as when it fails).
     * @param {string} state the new connection state.
     * @private
     */
    detectWhenConnectionHasFailed(state) {
      console.log("detectWhenConnectionHasFailed: state=" + state);
      switch (state) {
      case cloud.CONNECTIONSTATE.FAILED:
        console.error("Failed to connect to server");
        //show connection failed Error in browser
        document.querySelector("#connectionError").style.display = "inline-block";
        sessionStorage.removeItem(sessionStorage.getItem("connectionId"));
        sessionStorage.removeItem("connectionId");
        break;
      default:
        break;
      }
    }

    /**
     * Generate a random number using JS Crypto API.
     * @private
     * @returns {string} the generated short code.
     */
    static generateShortCode() {
      // To avoid confusion, exclude O, 0, I and 1
      let CCID_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      let shortCodeLength = 6;
      let min = Math.ceil(1), max = Math.floor(CCID_CHARS.length);
      // noinspection JSUnresolvedVariable
      let cryptoObj = window.crypto || window.msCrypto;

      let shortCode = "";
      for (let n = 0; n < shortCodeLength; n++) {
        // generate a secure random number in range
        let randomBuffer = new Uint32Array(1);
        cryptoObj.getRandomValues(randomBuffer);
        let randomNumber = randomBuffer[0] / (0xffffffff + 1);
        let sequence = Math.floor(randomNumber * (max - min + 1)) + min;
        // select a character from CCID range
        shortCode += (CCID_CHARS[sequence - 1]);
      }
      console.log("Generated short-code: " + shortCode);
      return shortCode;
    }

    /**
     * Connect to Live Experience.
     * @param {function} resolve method to call when connection is valid.
     * @param {function} reject method to call when connection fails.
     * @private
     */
    connectToLiveExperience(resolve, reject) {
      if (!(this.service.userID && this.service.userID !== "" && this.service.userID.indexOf("@") > 0)) {
        console.log("Invalid username: " + this.service.userID);
        this.logoutFromLiveExperience();
        return;
      }
      let jwt = this.service.authToken;
      let connectionId = sessionStorage.getItem("connectionId");
      if (connectionId) {
        console.log("Reconnecting to existing session: " + connectionId);
      }
      console.log("Logged in with username: " + this.service.userID + ", tenant: " + this.service.tenantID);
      let wsUri = this.service.address.replace(/^http/, "ws") + "/ws/webrtc/cloud";
      wsUri += "?jwt=" + jwt + "&tenant_profile_key=" + this.service.tenantID;
      this._connection = new cloud.Connection(this.service.userID, wsUri, resolve, reject)
        .withConnectionId(connectionId)
        .start();
      this._connection.setTrickleIceMode("full");
      console.log("Starting connection: wsUri=" + wsUri, this._connection);
    }

  } // end-Controller

  // return a Controller instance for require.js
  return {
    controller: new Controller()
  };
});
