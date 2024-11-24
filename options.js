const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

const tcDefaults = {
  speed: 1.0, // default:
  displayKeyCode: 86, // default: V
  rememberSpeed: false, // default: false
  audioBoolean: false, // default: false
  startHidden: false, // default: false
  forceLastSavedSpeed: false, //default: false
  enabled: true, // default enabled
  controllerOpacity: 0.3, // default: 0.3
  keyBindings: [
    { action: "display", key: 86, value: 0, force: false, predefined: true }, // V
    { action: "slower", key: 83, value: 0.1, force: false, predefined: true }, // S
    { action: "faster", key: 68, value: 0.1, force: false, predefined: true }, // D
    { action: "rewind", key: 90, value: 10, force: false, predefined: true }, // Z
    { action: "advance", key: 88, value: 10, force: false, predefined: true }, // X
    { action: "reset", key: 82, value: 1, force: false, predefined: true }, // R
    { action: "fast", key: 71, value: 1.8, force: false, predefined: true } // G
  ],
  blacklist: `www.instagram.com
    twitter.com
    imgur.com
    teams.microsoft.com
  `.replace(regStrip, "")
};

const keyCodeAliases = {
  0: "null",
  null: "null",
  undefined: "null",
  32: "Space",
  37: "Left",
  38: "Up",
  39: "Right",
  40: "Down",
  48: "0",
  49: "1",
  50: "2",
  51: "3",
  52: "4",
  53: "5",
  54: "6",
  55: "7",
  56: "8",
  57: "9",
  65: "A",
  66: "B",
  67: "C",
  68: "D",
  69: "E",
  70: "F",
  71: "G",
  72: "H",
  73: "I",
  74: "J",
  75: "K",
  76: "L",
  77: "M",
  78: "N",
  79: "O",
  80: "P",
  81: "Q",
  82: "R",
  83: "S",
  84: "T",
  85: "U",
  86: "V",
  87: "W",
  88: "X",
  89: "Y",
  90: "Z",
  96: "Num 0",
  97: "Num 1",
  98: "Num 2",
  99: "Num 3",
  100: "Num 4",
  101: "Num 5",
  102: "Num 6",
  103: "Num 7",
  104: "Num 8",
  105: "Num 9",
  106: "Num *",
  107: "Num +",
  109: "Num -",
  110: "Num .",
  111: "Num /",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  186: ";",
  188: "<",
  189: "-",
  187: "+",
  190: ">",
  191: "/",
  192: "~",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};

const KEY_MODIFIERS = {
  Ctrl: "Ctrl",
  Alt: "Alt",
  Shift: "Shift"
}

function recordKeyPress(e) {
  const keyCode = e.keyCode
  const keyCodeAlias = keyCodeAliases[keyCode]

  if (keyCodeAlias) {
    e.target.keyCode = keyCode;

    const modifiers = []
    if (e.altKey) modifiers.push(KEY_MODIFIERS.Alt)
    if (e.ctrlKey) modifiers.push(KEY_MODIFIERS.Ctrl)
    if (e.shiftKey) modifiers.push(KEY_MODIFIERS.Shift)

    if (modifiers) {
      const parent = e.target.parentElement
      for (let child of parent.children) {
        if (child.classList.contains("customForce"))
          child.value = true
      }
      toggle_show_experimental(false, true)
    }

    e.target.value = formatKeyCodeAndModifiers(keyCode, modifiers)

    e.preventDefault();
    e.stopPropagation();
  } else if (keyCode === 8) {
    // Clear input when backspace pressed
    e.target.value = "";
  } else if (keyCode === 27) {
    // When esc clicked, clear input
    e.target.value = "null";
    e.target.keyCode = null;
  }
}

function inputFilterNumbersOnly(e) {
  const char = e.key
  const actualInput = e.target.value
  if (!/[\d\.]$/.test(char) || !/^\d+(\.\d*)?$/.test(actualInput + char)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function inputFocus(e) {
  e.target.value = "";
}

function inputBlur(e) {
  e.target.value = keyCodeAliases[e.target.keyCode];
}

const formatKeyCodeAndModifiers = (keyCode, modifiers) => {
  const keyCodeAlias = keyCodeAliases[keyCode]
  if (!modifiers) return keyCodeAlias

  let text = ''
  for (let modifier of modifiers) {
    text += `${modifier}+`
  }

  text += keyCodeAlias

  return text

}

function updateCustomShortcutInputText(inputItem, keyCode, modifiers) {
  inputItem.value = formatKeyCodeAndModifiers(keyCode, modifiers);
  inputItem.keyCode = keyCode;
}

function eventCaller(event, className, func) {
  if (event.target.classList.contains(className))
    func(event);
}

// List of custom actions for which customValue should be disabled
const customActionsNoValues = ["pause", "muted", "mark", "jump", "display"];

function add_shortcut() {
  const html = `<select class="customDo">
    <option value="slower">Decrease speed</option>
    <option value="faster">Increase speed</option>
    <option value="rewind">Rewind</option>
    <option value="advance">Advance</option>
    <option value="reset">Reset speed</option>
    <option value="fast">Preferred speed</option>
    <option value="muted">Mute</option>
    <option value="softer">Decrease volume</option>
    <option value="louder">Increase volume</option>
    <option value="pause">Pause</option>
    <option value="mark">Set marker</option>
    <option value="jump">Jump to marker</option>
    <option value="display">Show/hide controller</option>
    </select>
    <input class="customKey" type="text" placeholder="press a key"/>
    <input class="customValue" type="text" placeholder="value (0.10)"/>
    <select class="customForce">
    <option value="false">Do not disable website key bindings</option>
    <option value="true">Disable website key bindings</option>
    </select>
    <button class="removeParent">X</button>`;
  const div = document.createElement("div");

  div.addEventListener("keypress", (event) => {
    eventCaller(event, "customValue", inputFilterNumbersOnly);
  });
  div.addEventListener("focus", (event) => {
    eventCaller(event, "customKey", inputFocus);
  });
  div.addEventListener("blur", (event) => {
    eventCaller(event, "customKey", inputBlur);
  });
  div.addEventListener("keydown", (event) => {
    eventCaller(event, "customKey", recordKeyPress);
  });
  div.addEventListener("click", (event) => {
    eventCaller(event, "removeParent", () => {
      event.target.parentNode.remove();
    });
  });
  div.addEventListener("change", (event) => {
    eventCaller(event, "customDo", () => {
      if (customActionsNoValues.includes(event.target.value)) {
        event.target.nextElementSibling.nextElementSibling.disabled = true;
        event.target.nextElementSibling.nextElementSibling.value = 0;
      } else {
        event.target.nextElementSibling.nextElementSibling.disabled = false;
      }
    });
  });

  div.setAttribute("class", "row customs");
  div.innerHTML = html;
  const customs_element = document.getElementById("customs");
  customs_element.insertBefore(
    div,
    customs_element.children[customs_element.childElementCount - 1]
  );
}

function createKeyBindings(item) {
  const action = item.querySelector(".customDo").value;
  const key = item.querySelector(".customKey").keyCode;
  const value = Number(item.querySelector(".customValue").value);
  let force = item.querySelector(".customForce").value;
  const predefined = !!item.id; //item.id ? true : false;

  const keyValue = item.querySelector(".customKey").value;

  const keyModifiers = [];
  for (let modifier of Object.values(KEY_MODIFIERS)) {
    if (keyValue.includes(modifier)) {
      keyModifiers.push(modifier)
    }
  }

  return {
    action: action,
    key: key,
    modifiers: keyModifiers,
    value: value,
    force: force,
    predefined: predefined
  }
}

// Validates settings before saving
function validate() {
  const blacklist = document.getElementById("blacklist");

  blacklist.value.split("\n").forEach((match) => {
    match = match.replace(regStrip, "");

    if (match.startsWith("/")) {
      try {
        const parts = match.split("/");

        if (parts.length < 3)
          throw "invalid regex";

        const flags = parts.pop();
        const regex = parts.slice(1).join("/");

        const regexp = new RegExp(regex, flags);
      } catch (err) {
        showStatusMessage("Error: Invalid blacklist regex: \"" + match + "\". Unable to save. Try wrapping it in forward slashes.")
        return false;
      }
    }
  });
  return true;
}

const showStatusMessage = (message, time) => {
  // Update status to let user know options were saved.
  const status = document.getElementById("status");
  status.textContent = message;
  setTimeout(function () {
    status.textContent = "";
  }, time ? time : 3000);
}

// Saves options to chrome.storage
function save_options() {
  if (!validate()) return;

  const keyBindings = []

  Array.from(document.querySelectorAll(".customs")).forEach((item) =>
    keyBindings.push(createKeyBindings(item))
  );

  const options = {
    rememberSpeed: document.getElementById("rememberSpeed").checked,
    forceLastSavedSpeed: document.getElementById("forceLastSavedSpeed").checked,
    audioBoolean: document.getElementById("audioBoolean").checked,
    enabled: document.getElementById("enabled").checked,
    startHidden: document.getElementById("startHidden").checked,
    controllerOpacity: document.getElementById("controllerOpacity").value,
    keyBindings: keyBindings,
    blacklist: document.getElementById("blacklist").value.replace(regStrip, "")
  }

  const removeKeys = chrome.storage.sync.remove([
    "resetSpeed",
    "speedStep",
    "fastSpeed",
    "rewindTime",
    "advanceTime",
    "resetKeyCode",
    "slowerKeyCode",
    "fasterKeyCode",
    "rewindKeyCode",
    "advanceKeyCode",
    "fastKeyCode"
  ]);

  const saveOptionsOnChromeStorage = chrome.storage.sync.set(options);

  const successFunction = () => showStatusMessage("Options saved")
  const failureFunction = (reason) => {
    showStatusMessage("An error occurred while trying to save")
    console.log("An error occurred while trying to save,", reason);
  }

  Promise.all([removeKeys, saveOptionsOnChromeStorage])
    .then(successFunction, failureFunction)
    .then(restore_options)

}

// Restores options from chrome.storage
function restore_options() {
  chrome.storage.sync.get(tcDefaults, function (storage) {
    toggle_show_experimental(true)

    document
      .querySelectorAll(".removeParent")
      .forEach((button) => button.click()); // Remove added shortcuts

    document.getElementById("rememberSpeed").checked = storage.rememberSpeed;
    document.getElementById("forceLastSavedSpeed").checked = storage.forceLastSavedSpeed;
    document.getElementById("audioBoolean").checked = storage.audioBoolean;
    document.getElementById("enabled").checked = storage.enabled;
    document.getElementById("startHidden").checked = storage.startHidden;
    document.getElementById("controllerOpacity").value =
      storage.controllerOpacity;
    document.getElementById("blacklist").value = storage.blacklist;

    // ensure that there is a "display" binding for upgrades from versions that had it as a separate binding
    if (storage.keyBindings.filter((x) => x.action === "display").length === 0) {
      storage.keyBindings.push({
        action: "display",
        value: 0,
        force: false,
        predefined: true
      });
    }

    for (let i in storage.keyBindings) {
      const item = storage.keyBindings[i];
      if (item.predefined) {
        //do predefined ones because their value needed for overlay
        // document.querySelector("#" + item["action"] + " .customDo").value = item["action"];
        if (item.action=== "display" && typeof item.key === "undefined") {
          item.key = storage.displayKeyCode || tcDefaults.displayKeyCode; // V
        }

        if (customActionsNoValues.includes(item.action))
          document.querySelector(
            "#" + item.action + " .customValue"
          ).disabled = true;

        updateCustomShortcutInputText(
          document.querySelector("#" + item.action + " .customKey"),
          item.key,
          item.modifiers
        );
        document.querySelector("#" + item.action + " .customValue").value =
          item.value;
        document.querySelector("#" + item.action + " .customForce").value =
          item.force;
      } else {
        // new ones
        add_shortcut();
        const dom = document.querySelector(".customs:last-of-type");
        dom.querySelector(".customDo").value = item.action;

        if (customActionsNoValues.includes(item.action))
          dom.querySelector(".customValue").disabled = true;

        updateCustomShortcutInputText(
          dom.querySelector(".customKey"),
          item.key,
          item.modifiers
        );
        dom.querySelector(".customValue").value = item.value;
        dom.querySelector(".customForce").value = item.force;
      }
    }
  });
}

function restore_defaults() {
  chrome.storage.sync.set(tcDefaults, function () {
    restore_options();
    // Update status to let user know options were saved.
    showStatusMessage("Default options restored")
  });
}

function toggle_show_experimental(forceHide, forceShow) {
  const elements = document.querySelectorAll(".customForce")
  if (!elements) return

  const firstElementDisplay = elements[0].style.display

  for (let item of elements) {
    if (forceShow) item.style.display = "inline-block"
    else if (forceHide || firstElementDisplay === "inline-block") {
      item.style.display = "none"
    } else item.style.display = "inline-block"
  }
}

const importOptions = () => {
  const input = document.createElement("input");
  input.type = "file"

  const onchange = (event) => {
    const files = event.target.files;

    if (files.length > 0) {
      const file = files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        const options = JSON.parse(e.target.result);

        chrome.storage.sync.set(options)
          .then(restore_options)
          .then(() => showStatusMessage("Options imported"))
      };

      reader.readAsText(file);
    }
  }

  input.addEventListener("change", onchange);
  input.click()
  input.remove()

}

const exportOptions = async () => {
  const options = await chrome.storage.sync.get(tcDefaults)
  jsonToFileAndDownload(options, "video-speed-controller-options")
}

const jsonToFileAndDownload = (obj, filename) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();

  a.remove()
  URL.revokeObjectURL(url);
};

document.addEventListener("DOMContentLoaded", function () {
  restore_options();

  document.getElementById("save").addEventListener("click", save_options);
  document.getElementById("add").addEventListener("click", add_shortcut);
  document
    .getElementById("restore")
    .addEventListener("click", restore_defaults);
  document
    .getElementById("experimental")
    .addEventListener("click", () => toggle_show_experimental());

  document.getElementById("import").addEventListener("click", importOptions);
  document.getElementById("export").addEventListener("click", exportOptions);

});
