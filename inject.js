const LOG_LEVEL = {
  FATAL: 1,
  ERROR: 2,
  WARNING: 3,
  INFO: 4,
  DEBUG: 5,
  TRACE: 6
}

const levels = {
  [LOG_LEVEL.FATAL]: (message) => fatal(message),
  [LOG_LEVEL.ERROR]: (message) => error(message),
  [LOG_LEVEL.WARNING]: (message) => warning(message),
  [LOG_LEVEL.INFO]: (message) => info(message),
  [LOG_LEVEL.DEBUG]: (message) => debug(message),
  [LOG_LEVEL.TRACE]: (message) => trace(message)
}

const log = (message, level = LOG_LEVEL.DEBUG) => levels[level](message)
const error = (message, error) => console.error(`ERROR: ${message}`, error)
const warning = (message) => console.warn(`WARNING: ${message}`)
const info = (message) => console.info(`INFO: ${message}`)
const debug = (message) => console.debug(`DEBUG: ${message}`)
const trace = (message) => console.trace(`TRACE: ${message}`)
const fatal = (message) => console.info(`FATAL: ${message}`)

const tc = {
  settings: {
    lastSpeed: 1.0, // default 1x
    enabled: true, // default enabled
    speeds: {}, // empty object to hold speed for each source
    displayKeyCode: 86, // default: V
    rememberSpeed: false, // default: false
    forceLastSavedSpeed: false, //default: false
    audioBoolean: false, // default: false
    startHidden: false, // default: false
    controllerOpacity: 0.3, // default: 0.3
    keyBindings: [],
    blacklist: `\
      www.instagram.com
      twitter.com
      vine.co
      imgur.com
      teams.microsoft.com
    `.replace(regStrip, "")
  },

  // Holds a reference to all the AUDIO/VIDEO DOM elements we've attached to
  mediaElements: []
};

class VideoController {

  video
  parent
  controllerElement
  handlePlay
  handleSeek
  speedIndicator

  constructor(target, parent) {
    console.log(tcDefaults.keyBindings);
    if (target.vsc) {
      return target.vsc;
    }

    tc.mediaElements.push(target);

    this.video = target;
    this.parent = target.parentElement || parent || target.parentNode;
    let storedSpeed = tc.settings.speeds[target.currentSrc];
    if (!tc.settings.rememberSpeed) {
      if (!storedSpeed) {
        debug("Overwriting stored speed to 1.0 due to rememberSpeed being disabled")
        storedSpeed = 1.0;
      }
      setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed
    } else {
      debug("Recalling stored speed due to rememberSpeed being enabled");
      storedSpeed = tc.settings.lastSpeed;
    }

    debug("Explicitly setting playbackRate to: " + storedSpeed);
    target.playbackRate = storedSpeed;

    this.controllerElement = this.initializeControls();

    const mediaEventAction = (event) => {
      storedSpeed = tc.settings.speeds[event.target.currentSrc];
      if (!tc.settings.rememberSpeed) {
        if (!storedSpeed) {
          debug("Overwriting stored speed to 1.0 (rememberSpeed not enabled)");
          storedSpeed = 1.0;
        }
        // resetSpeed isn't really a reset, it's a toggle
        debug("Setting reset keybinding to fast");
        setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed
      } else {
        debug("Storing lastSpeed into tc.settings.speeds (rememberSpeed enabled)");
        storedSpeed = tc.settings.lastSpeed;
      }
      // TODO: Check if explicitly setting the playback rate to 1.0 is
      // necessary when rememberSpeed is disabled (this may accidentally
      // override a website's intentional initial speed setting interfering
      // with the site's default behavior)
      debug("Explicitly setting playbackRate to: " + storedSpeed);
      setSpeed(event.target, storedSpeed);
    };

    target.addEventListener(
      "play",
      (this.handlePlay = mediaEventAction.bind(this))
    );

    target.addEventListener(
      "seeked",
      (this.handleSeek = mediaEventAction.bind(this))
    );

    const targetObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "src" ||
            mutation.attributeName === "currentSrc")
        ) {
          debug("mutation of A/V element");
          const controller = this.controllerElement;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            controller.classList.add("vsc-nosource");
          } else {
            controller.classList.remove("vsc-nosource");
          }
        }
      });
    });
    targetObserver.observe(target, {
      attributeFilter: ["src", "currentSrc"]
    });
  };

  remove() {
    this.controllerElement.remove();
    this.video.removeEventListener("play", this.handlePlay);
    this.video.removeEventListener("seek", this.handleSeek);
    delete this.video.vsc;
    let idx = tc.mediaElements.indexOf(this.video);
    if (idx !== -1) {
      tc.mediaElements.splice(idx, 1);
    }
  };

  // TODO: Save dragging position for specific websites and size
  initializeControls() {
    debug("initializeControls Begin");
    const document = this.video.ownerDocument;
    const speed = this.video.playbackRate.toFixed(2);

    debug("Speed variable set to: " + speed);

    const wrapper = document.createElement("div");
    wrapper.classList.add("vsc-controller");

    if (!this.video.currentSrc) {
      wrapper.classList.add("vsc-nosource");
    }

    if (tc.settings.startHidden) {
      wrapper.classList.add("vsc-hidden");
    }

    const shadow = wrapper.attachShadow({ mode: "open" });
    shadow.innerHTML = `
        <style>
          @import "${chrome.runtime.getURL("assets/css/shadow.css")}";
        </style>

        <div id="controller" style="top:${0}; left:${0}; opacity:${
      tc.settings.controllerOpacity
    }">
          <span data-action="drag" class="draggable">${speed}</span>
          <span id="controls">
            <button data-action="rewind" class="rw">«</button>
            <button data-action="slower">&minus;</button>
            <button data-action="faster">&plus;</button>
            <button data-action="advance" class="rw">»</button>
            <button data-action="display" class="hideButton">&times;</button>
          </span>
        </div>
      `;
    shadow.querySelector(".draggable").addEventListener(
      "mousedown",
      (e) => {
        runAction(e.target.dataset["action"], false, e);
        e.stopPropagation();
      },
      true
    );

    shadow.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", (e) => {
          runAction(e.target.dataset["action"], getKeyBindings(e.target.dataset["action"]), e);
          e.stopPropagation();
        },
        true
      );
    });

    const controller = shadow.querySelector("#controller")
    controller.addEventListener("click", (e) => e.stopPropagation(), false);
    controller.addEventListener("mousedown", (e) => e.stopPropagation(), false);

    const resizeObserver = new ResizeObserver(() => {
      const rect = this.video.getBoundingClientRect();
      // getBoundingClientRect is relative to the viewport; style coordinates
      // are relative to offsetParent, so we adjust for that here. offsetParent
      // can be null if the video has `display: none` or is not yet in the DOM.
      const offsetRect = this.video.offsetParent?.getBoundingClientRect();
      controller.style.top = Math.max(rect.top - (offsetRect?.top || 0), 0) + "px"
      controller.style.left = Math.max(rect.left - (offsetRect?.left || 0), 0) + "px"
    })
    resizeObserver.observe(this.video)
    resizeObserver.observe(document.body)

    this.speedIndicator = shadow.querySelector("span");
    const fragment = document.createDocumentFragment();
    fragment.appendChild(wrapper);

    switch (true) {
      // Only special-case Prime Video, not product-page videos (which use
      // "vjs-tech"), otherwise the overlay disappears in fullscreen mode
      case location.hostname === "www.amazon.com" && !this.video.classList.contains("vjs-tech"):
      case location.hostname === "www.reddit.com":
      case /hbogo\./.test(location.hostname):
        // insert before parent to bypass overlay
        if (!this.parent.parentElement) this.parent.insertBefore(fragment, this.parent.firstChild);
        else this.parent.parentElement.insertBefore(fragment, this.parent);
        break;
      case location.hostname === "www.facebook.com":
        // this is a monstrosity but new FB design does not have *any*
        // semantic handles for us to traverse the tree, and deep nesting
        // that we need to bubble up from to get controller to stack correctly
        let p = this.parent.parentElement.parentElement.parentElement
          .parentElement.parentElement.parentElement.parentElement;
        p.insertBefore(fragment, p.firstChild);
        break;
      case location.hostname === "tv.apple.com":
        // insert before parent to bypass overlay
        this.parent.parentNode.insertBefore(fragment, this.parent.parentNode.firstChild);
        break;
      case location.hostname === "www.youtube.com":
        // sometimes, the controller gets buried under the video
        // by inserting it at the parent level, we ensure that it's on top
        const parent = this.parent.parentElement;
        parent.insertBefore(fragment, parent.firstChild);
        break;
      default:
        // Note: when triggered via a MutationRecord, it's possible that the
        // target is not the immediate parent. This appends the controller as
        // the first element of the target, which may not be the parent.
        this.parent.insertBefore(fragment, this.parent.firstChild);
    }
    return wrapper;
  };
}

chrome.storage.sync.get(tc.settings, (storage) => {
  tc.settings.keyBindings = storage.keyBindings; // Array
  if (storage.keyBindings.length === 0) {
    // if first initialization of 0.5.3
    // UPDATE
    tc.settings.keyBindings.push({
      action: "slower",
      key: Number(storage.slowerKeyCode) || 83,
      value: Number(storage.speedStep) || 0.1,
      force: false,
      predefined: true
    }); // default S
    tc.settings.keyBindings.push({
      action: "faster",
      key: Number(storage.fasterKeyCode) || 68,
      value: Number(storage.speedStep) || 0.1,
      force: false,
      predefined: true
    }); // default: D
    tc.settings.keyBindings.push({
      action: "rewind",
      key: Number(storage.rewindKeyCode) || 90,
      value: Number(storage.rewindTime) || 10,
      force: false,
      predefined: true
    }); // default: Z
    tc.settings.keyBindings.push({
      action: "advance",
      key: Number(storage.advanceKeyCode) || 88,
      value: Number(storage.advanceTime) || 10,
      force: false,
      predefined: true
    }); // default: X
    tc.settings.keyBindings.push({
      action: "reset",
      key: Number(storage.resetKeyCode) || 82,
      value: 1.0,
      force: false,
      predefined: true
    }); // default: R
    tc.settings.keyBindings.push({
      action: "fast",
      key: Number(storage.fastKeyCode) || 71,
      value: Number(storage.fastSpeed) || 1.8,
      force: false,
      predefined: true
    }); // default: G
    tc.settings.version = "0.5.3";

    chrome.storage.sync.set({
      keyBindings: tc.settings.keyBindings,
      version: tc.settings.version,
      displayKeyCode: tc.settings.displayKeyCode,
      rememberSpeed: tc.settings.rememberSpeed,
      forceLastSavedSpeed: tc.settings.forceLastSavedSpeed,
      audioBoolean: tc.settings.audioBoolean,
      startHidden: tc.settings.startHidden,
      enabled: tc.settings.enabled,
      controllerOpacity: tc.settings.controllerOpacity,
      blacklist: tc.settings.blacklist.replace(regStrip, "")
    });
  }
  tc.settings.lastSpeed = Number(storage.lastSpeed);
  tc.settings.displayKeyCode = Number(storage.displayKeyCode);
  tc.settings.rememberSpeed = Boolean(storage.rememberSpeed);
  tc.settings.forceLastSavedSpeed = Boolean(storage.forceLastSavedSpeed);
  tc.settings.audioBoolean = Boolean(storage.audioBoolean);
  tc.settings.enabled = Boolean(storage.enabled);
  tc.settings.startHidden = Boolean(storage.startHidden);
  tc.settings.controllerOpacity = Number(storage.controllerOpacity);
  tc.settings.blacklist = String(storage.blacklist);

  // ensure that there is a "display" binding (for upgrades from versions that had it as a separate binding)
  if (
    tc.settings.keyBindings.filter((x) => x.action === "display").length === 0
  ) {
    tc.settings.keyBindings.push({
      action: "display",
      key: Number(storage.displayKeyCode) || 86,
      value: 0,
      force: false,
      predefined: true
    }); // default V
  }

  initializeWhenReady(document);
});

function getKeyBindings(action, what = "value") {
  try {
    return tc.settings.keyBindings.find((item) => item.action === action)[what];
  } catch (e) {
    return false;
  }
}

function setKeyBindings(action, value) {
  tc.settings.keyBindings.find((item) => item.action === action)[
    "value"
  ] = value;
}

function escapeStringRegExp(str) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function isBlacklisted() {
  let blacklisted = false;
  tc.settings.blacklist.split("\n").forEach((match) => {
    match = match.replace(regStrip, "");
    if (match.length === 0) {
      return;
    }

    let regexp;
    if (match.startsWith("/")) {
      try {
        const parts = match.split("/");

        let flags;
        let regex;
        if (regEndsWithFlags.test(match)) {
          flags = parts.pop();
          regex = parts.slice(1).join("/");
        } else {
          flags = "";
          regex = match;
        }

        regexp = new RegExp(regex, flags);
      } catch (err) {
        return;
      }
    } else {
      regexp = new RegExp(escapeStringRegExp(match));
    }

    if (regexp.test(location.href)) {
      blacklisted = true;
    }
  });
  return blacklisted;
}

let coolDown = false;

function refreshCoolDown() {
  debug("Begin refreshCoolDown");
  if (coolDown) {
    clearTimeout(coolDown);
  }
  coolDown = setTimeout(() => {
    coolDown = false;
  }, 1000);
  debug("End refreshCoolDown");
}

function setupListener() {
  /**
   * This function is run whenever a video speed rate change occurs.
   * It is used to update the speed that shows up in the display as well as save
   * that latest speed into the local storage.
   *
   * @param {*} video The video element to update the speed indicators for.
   */
  function updateSpeedFromEvent(video) {
    // It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
    // a video controller attached to it.  If we do, ignore it.
    if (!video.vsc)
      return;
    const speedIndicator = video.vsc.speedIndicator;
    const src = video.currentSrc;
    const speed = Number(video.playbackRate.toFixed(2));

    info("Playback rate changed to " + speed);

    debug("Updating controller with new speed");
    speedIndicator.textContent = speed.toFixed(2);
    tc.settings.speeds[src] = speed;
    debug("Storing lastSpeed in settings for the rememberSpeed feature");
    tc.settings.lastSpeed = speed;
    debug("Syncing chrome settings for lastSpeed");
    chrome.storage.sync.set({ lastSpeed: speed }, () => {
      debug("Speed setting saved: " + speed);
    });
    // show the controller for 1000ms if it's hidden.
    runAction("blink", null, null);
  }

  document.addEventListener(
    "ratechange",
    function(event) {
      if (coolDown) {
        info("Speed event propagation blocked");
        event.stopImmediatePropagation();
      }
      /**
       * Normally we'd do 'event.target' here. But that doesn't work with shadow DOMs. For
       * an event that bubbles up out of a shadow DOM, event.target is the root of the shadow
       * DOM. For 'open' shadow DOMs, event.composedPath()[0] is the actual element that will
       * first receive the event, and it's equivalent to event.target in non-shadow-DOM cases.
       */
      let video = event.composedPath()[0];

      /**
       * If the last speed is forced, only update the speed based on events created by
       * video speed instead of all video speed change events.
       */
      if (tc.settings.forceLastSavedSpeed) {
        if (event.detail && event.detail.origin === "videoSpeed") {
          video.playbackRate = event.detail.speed;
          updateSpeedFromEvent(video);
        } else {
          video.playbackRate = tc.settings.lastSpeed;
        }
        event.stopImmediatePropagation();
      } else {
        updateSpeedFromEvent(video);
      }
    },
    true
  );
}

function initializeWhenReady(document) {
  debug("Begin initializeWhenReady");
  if (isBlacklisted()) {
    return;
  }
  window.onload = () => {
    initializeNow(window.document);
  };
  if (document) {
    if (document.readyState === "complete") {
      initializeNow(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === "complete") {
          initializeNow(document);
        }
      };
    }
  }
  debug("End initializeWhenReady");
}
function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
function getShadow(parent) {
  let result = [];
  function getChild(parent) {
    if (parent.firstElementChild) {
      let child = parent.firstElementChild;
      do {
        result.push(child);
        getChild(child);
        if (child.shadowRoot) {
          result.push(getShadow(child.shadowRoot));
        }
        child = child.nextElementSibling;
      } while (child);
    }
  }
  getChild(parent);
  return result.flat(Infinity);
}

function initializeNow(document) {
  debug("Begin initializeNow");
  if (!tc.settings.enabled) return;
  // enforce init-once due to redundant callers
  if (!document.body || document.body.classList.contains("vsc-initialized")) {
    return;
  }
  try {
    setupListener();
  } catch {
    // no operation
  }
  document.body.classList.add("vsc-initialized");
  debug("initializeNow: vsc-initialized added to document body");

  injectScriptForSite();

  if (document !== window.document) {
    const link = document.createElement("link");
    link.href = chrome.runtime.getURL("assets/css/inject.css");
    link.type = "text/css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  const docs = Array(document);
  try {
    if (inIframe()) docs.push(window.top.document);
  } catch (e) {}

  docs.forEach((doc) => {
    doc.addEventListener(
      "keydown",
      (event) => {
        const keyCode = event.keyCode;
        debug("Processing keydown event: " + keyCode);

        // Ignore if following modifier is active.
        if (
          !event.getModifierState ||
          event.getModifierState("Alt") ||
          event.getModifierState("Control") ||
          event.getModifierState("Fn") ||
          event.getModifierState("Meta") ||
          event.getModifierState("Hyper") ||
          event.getModifierState("OS")
        ) {
          debug("Keydown event ignored due to active modifier: " + keyCode);
          return;
        }

        // Ignore keydown event if typing in an input box
        if (
          event.target.nodeName === "INPUT" ||
          event.target.nodeName === "TEXTAREA" ||
          event.target.isContentEditable
        ) {
          return false;
        }

        // Ignore keydown event if typing in a page without vsc
        if (!tc.mediaElements.length) {
          return false;
        }

        const item = tc.settings.keyBindings.find((item) => item.key === keyCode);
        if (item) {
          runAction(item.action, item.value);
          if (item.force === "true") {
            // disable websites key bindings
            event.preventDefault();
            event.stopPropagation();
          }
        }

        return false;
      },
      true
    );
  });

  function checkForVideoAndShadowRoot(node, parent, added) {
    // Only proceed with supposed removal if node is missing from DOM
    if (!added && document.body?.contains(node)) {
      // This was written prior to the addition of shadowRoot processing.
      // TODO: Determine if shadowRoot deleted nodes need this sort of 
      // check as well.
      return;
    }
    if (
      node.nodeName === "VIDEO" ||
      (node.nodeName === "AUDIO" && tc.settings.audioBoolean)
    ) {
      if (added) {
        node.vsc = new VideoController(node, parent);
      } else {
        if (node.vsc) {
          node.vsc.remove();
        }
      }
    } else {
      let children = [];
      if (node.shadowRoot) {
        documentAndShadowRootObserver.observe(node.shadowRoot, documentAndShadowRootObserverOptions);
        children = Array.from(node.shadowRoot.children);
      }
      if (node.children) {
        children = [...children, ...node.children];
      }
      for (const child of children) {
        checkForVideoAndShadowRoot(child, child.parentNode || parent, added)
      }
    }
  }

  const documentAndShadowRootObserver = new MutationObserver((mutations) => {
    // Process the DOM nodes lazily
    requestIdleCallback(
      (_) => {
        mutations.forEach((mutation) => {
          switch (mutation.type) {
            case "childList":
              mutation.addedNodes.forEach((node) => {
                if (typeof node === "function") return;
                if (node === document.documentElement) {
                  // This happens on sites that use document.write, e.g. watch.sling.com
                  // When the document gets replaced, we lose all event handlers, so we need to reinitialize
                  debug("Document was replaced, reinitializing");
                  initializeWhenReady(document);
                  return;
                }
                checkForVideoAndShadowRoot(node, node.parentNode || mutation.target, true);
              });
              mutation.removedNodes.forEach((node) => {
                if (typeof node === "function") return;
                checkForVideoAndShadowRoot(node, node.parentNode || mutation.target, false);
              });
              break;
            case "attributes":
              if (
                (mutation.target.attributes["aria-hidden"] &&
                mutation.target.attributes["aria-hidden"].value === "false")
                || mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER'
              ) {
                const flattenedNodes = getShadow(document.body);
                const nodes = flattenedNodes.filter(
                  (x) => x.tagName === "VIDEO"
                );
                for (let node of nodes) {
                  // only add vsc the first time for the apple-tv case (the attribute change is triggered every time you click the vsc)
                  if (node.vsc && mutation.target.nodeName === 'APPLE-TV-PLUS-PLAYER')
                    continue;
                  if (node.vsc)
                    node.vsc.remove();
                  checkForVideoAndShadowRoot(node, node.parentNode || mutation.target, true);
                }
              }
              break;
          }
        });
      },
      { timeout: 1000 }
    );
  });
  const documentAndShadowRootObserverOptions = {
    attributeFilter: ["aria-hidden", "data-focus-method"],
    childList: true,
    subtree: true
  };
  documentAndShadowRootObserver.observe(document, documentAndShadowRootObserverOptions);

  const mediaTagSelector = tc.settings.audioBoolean ? "video,audio" : "video";
  const mediaTags = Array.from(document.querySelectorAll(mediaTagSelector));

  document.querySelectorAll("*").forEach((element) => {
    if (element.shadowRoot) {
      documentAndShadowRootObserver.observe(element.shadowRoot, documentAndShadowRootObserverOptions);
      mediaTags.push(...element.shadowRoot.querySelectorAll(mediaTagSelector));
    }
  });

  mediaTags.forEach((video) => {
    video.vsc = new VideoController(video);
  });

  const frameTags = document.getElementsByTagName("iframe");
  Array.prototype.forEach.call(frameTags, (frame) => {
    // Ignore frames we don't have permission to access (different origin).
    try {
      initializeWhenReady(frame.contentDocument);
    } catch (e) {
      error("Error initializing contentDocument", e)
    }
  });
  debug("End initializeNow");
}

function setSpeed(video, speed) {
  debug("setSpeed started: " + speed);
  const speedValue = speed.toFixed(2);
  if (tc.settings.forceLastSavedSpeed) {
    video.dispatchEvent(
      new CustomEvent("ratechange", {
        // bubbles and composed are needed to allow event to 'escape' open shadow DOMs
        bubbles: true,
        composed: true,
        detail: { origin: "videoSpeed", speed: speedValue }
      })
    );
  } else {
    video.playbackRate = Number(speedValue);
  }
  const speedIndicator = video.vsc.speedIndicator;
  speedIndicator.textContent = speedValue;
  tc.settings.lastSpeed = speed;
  refreshCoolDown();
  debug("setSpeed finished: " + speed);
}

function runAction(action, value, e) {
  debug("runAction Begin");

  const mediaTags = tc.mediaElements;

  // Get the controller that was used if called from a button press event e
  let targetController
  if (e) {
    targetController = e.target.getRootNode().host;
  }

  mediaTags.forEach((video) => {
    const controller = video.vsc.controllerElement;

    // Don't change video speed if the video has a different controller
    if (e && !(targetController === controller)) {
      return;
    }

    showController(controller);

    let speed
    if (!video.classList.contains("vsc-cancelled")) {
      if (action === "rewind") {
        debug("Rewind");
        seek(video, -value);
      } else if (action === "advance") {
        debug("Fast forward");
        seek(video, value);
      } else if (action === "faster") {
        debug("Increase speed");
        // Maximum playback speed in Chrome is set to 16:
        // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/media/html_media_element.h;l=117;drc=70155ab40e50115ac8cff6e8f4b7703a7784d854
        speed = Math.min(
          (video.playbackRate < 0.1 ? 0.0 : video.playbackRate) + value,
          16
        );
        setSpeed(video, speed);
      } else if (action === "slower") {
        debug("Decrease speed");
        // Video min rate is 0.0625:
        // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/media/html_media_element.h;l=116;drc=70155ab40e50115ac8cff6e8f4b7703a7784d854
        speed = Math.max(video.playbackRate - value, 0.07);
        setSpeed(video, speed);
      } else if (action === "reset") {
        debug("Reset speed");
        resetSpeed(video, 1.0);
      } else if (action === "display") {
        debug("Showing controller");
        controller.classList.add("vsc-manual");
        controller.classList.toggle("vsc-hidden");
      } else if (action === "blink") {
        debug("Showing controller momentarily");
        // if vsc is hidden, show it briefly to give the use visual feedback that the action is excuted.
        if (
          controller.classList.contains("vsc-hidden") ||
          controller.blinkTimeOut !== undefined
        ) {
          clearTimeout(controller.blinkTimeOut);
          controller.classList.remove("vsc-hidden");
          controller.blinkTimeOut = setTimeout(
            () => {
              controller.classList.add("vsc-hidden");
              controller.blinkTimeOut = undefined;
            },
            value ? value : 1000
          );
        }
      } else if (action === "drag") {
        handleDrag(video, e);
      } else if (action === "fast") {
        resetSpeed(video, value);
      } else if (action === "pause") {
        pause(video);
      } else if (action === "muted") {
        muted(video);
      } else if (action === "louder") {
        volumeUp(video, value);
      } else if (action === "softer") {
        volumeDown(video, value);
      } else if (action === "mark") {
        setMark(video);
      } else if (action === "jump") {
        jumpToMark(video);
      }
    }
  });
  debug("runAction End");
}

function injectScriptForSite() {
  const script = document.createElement("script");
  switch (true) {
    case location.hostname === "www.netflix.com":
      script.src = chrome.runtime.getURL('scriptforsite/netflix.js');
      break;
  }
  if (script.src) {
    document.head.appendChild(script);
  }
}

function seek(mediaTag, seekSeconds) {
  switch (true) {
    case location.hostname === "www.netflix.com":
      window.postMessage({action: "videospeed-seek", seekMs: seekSeconds * 1000}, "https://www.netflix.com");
      break;
    default:
      mediaTag.currentTime += seekSeconds;
  }
}

function pause(v) {
  if (v.paused) {
    debug("Resuming video");
    v.play();
  } else {
    debug("Pausing video");
    v.pause();
  }
}

function resetSpeed(v, target) {
  if (v.playbackRate === target) {
    if (v.playbackRate === getKeyBindings("reset")) {
      if (target !== 1.0) {
        info("Resetting playback speed to 1.0");
        setSpeed(v, 1.0);
      } else {
        info('Toggling playback speed to "fast" speed');
        setSpeed(v, getKeyBindings("fast"));
      }
    } else {
      info('Toggling playback speed to "reset" speed');
      setSpeed(v, getKeyBindings("reset"));
    }
  } else {
    info('Toggling playback speed to "reset" speed');
    setKeyBindings("reset", v.playbackRate);
    setSpeed(v, target);
  }
}

function muted(v) {
  v.muted = v.muted !== true;
}

function volumeUp(v, value) {
  v.volume = Math.min(1, (v.volume + value).toFixed(2));
}

function volumeDown(v, value) {
  v.volume = Math.max(0, (v.volume - value).toFixed(2));
}

function setMark(v) {
  debug("Adding marker");
  v.vsc.mark = v.currentTime;
}

function jumpToMark(video) {
  debug("Recalling marker");
  if (video.vsc.mark && typeof video.vsc.mark === "number") {
    video.currentTime = video.vsc.mark;
  }
}

function handleDrag(video, e) {
  const controller = video.vsc.controllerElement;
  const shadowController = controller.shadowRoot.querySelector("#controller");

  // Find nearest parent of same size as video parent.
  let parentElement = controller.parentElement;
  while (
    parentElement.parentNode &&
    parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
    parentElement.parentNode.offsetWidth === parentElement.offsetWidth
  ) {
    parentElement = parentElement.parentNode;
  }

  video.classList.add("vcs-dragging");
  shadowController.classList.add("dragging");

  const initialMouseXY = [e.clientX, e.clientY];
  const initialControllerXY = [
    parseInt(shadowController.style.left),
    parseInt(shadowController.style.top)
  ];

  const startDragging = (e) => {
    let style = shadowController.style;
    let dx = e.clientX - initialMouseXY[0];
    let dy = e.clientY - initialMouseXY[1];
    style.left = initialControllerXY[0] + dx + "px";
    style.top = initialControllerXY[1] + dy + "px";
  };

  const stopDragging = () => {
    parentElement.removeEventListener("mousemove", startDragging);
    parentElement.removeEventListener("mouseup", stopDragging);
    parentElement.removeEventListener("mouseleave", stopDragging);

    shadowController.classList.remove("dragging");
    video.classList.remove("vcs-dragging");
  };

  parentElement.addEventListener("mouseup", stopDragging);
  parentElement.addEventListener("mouseleave", stopDragging);
  parentElement.addEventListener("mousemove", startDragging);
}

let timer = null;
function showController(controller) {
  info("Showing controller");
  controller.classList.add("vcs-show");

  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    controller.classList.remove("vcs-show");
    timer = false;
    debug("Hiding controller");
  }, 2000);
}
