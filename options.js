import { showMessage } from "./message-handler.js";
import { regStrip, keyCodeAliases, KEY_MODIFIERS, tcDefaults, disabledCustomActions, customDoOptions } from "./constants.js";

function recordKeyPress(e) {
  const keyCode = e.keyCode
  const keyCodeAlias = keyCodeAliases[keyCode]

  if (keyCodeAlias) {
    e.target.keyCode = keyCode;

    const modifiers = []
    if (e.altKey) modifiers.push(KEY_MODIFIERS.Alt)
    if (e.ctrlKey) modifiers.push(KEY_MODIFIERS.Ctrl)
    if (e.shiftKey) modifiers.push(KEY_MODIFIERS.Shift)

    if (modifiers.length > 0) {
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

function eventCaller(event, className, func) {
  if (event.target.classList.contains(className))
    func(event);
}

function add_shortcut({action, key, modifiers, value, force}) {
  const div = document.createElement("div");
  div.setAttribute("class", "row customs");

  const customDoSelectElement = document.createElement("select");
  customDoSelectElement.setAttribute("class", "customDo");

  for (let customDoOption of customDoOptions) {
    const option = document.createElement("option");
    option.value = customDoOption.value;
    option.text = customDoOption.text;
    customDoSelectElement.add(option)
  }

  if (action !== undefined) {
    customDoSelectElement.value = action;
  }
  div.appendChild(customDoSelectElement)
  div.appendChild(document.createTextNode (" "))

  const customKeyElement = document.createElement("input");
  customKeyElement.setAttribute("class", "customKey")
  customKeyElement.setAttribute("type", "text");
  customKeyElement.setAttribute("placeholder", "press a key");

  if (key !== undefined) {
    customKeyElement.value = formatKeyCodeAndModifiers(key, modifiers);
    customKeyElement.keyCode = key;
  }
  div.appendChild(customKeyElement)
  div.appendChild(document.createTextNode (" "))

  const customValueElement = document.createElement("input");
  customValueElement.setAttribute("class", "customValue")
  customValueElement.setAttribute("type", "text");
  customValueElement.setAttribute("placeholder", "value (0.10)");

  if (value !== undefined) customValueElement.value = value
  if (action !== undefined && disabledCustomActions.includes(action)) customValueElement.disabled = true;
  div.appendChild(customValueElement)
  div.appendChild(document.createTextNode (" "))

  const customForceSelect = document.createElement("select");
  customForceSelect.setAttribute("class", "customForce");

  const customForceOption1 = document.createElement("option");
  customForceOption1.value = "false";
  customForceOption1.text = "Do not disable website key bindings"
  customForceSelect.add(customForceOption1)

  const customForceOption2 = document.createElement("option");
  customForceOption2.value = "true";
  customForceOption2.text = "Disable website key bindings"
  customForceSelect.add(customForceOption2)

  if (force !== undefined) customForceSelect.value = force
  div.appendChild(customForceSelect)
  div.appendChild(document.createTextNode (" "))

  const buttonElement = document.createElement("button");
  buttonElement.setAttribute("class", "removeParent")
  buttonElement.innerText = "X"

  div.appendChild(buttonElement)


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
      if (disabledCustomActions.includes(event.target.value)) {
        event.target.nextElementSibling.nextElementSibling.disabled = true;
        event.target.nextElementSibling.nextElementSibling.value = 0;
      } else {
        event.target.nextElementSibling.nextElementSibling.disabled = false;
      }
    });
  });

  const customElement = document.getElementById("customs");
  customElement.insertBefore(
    div,
    document.getElementById("add")
  );
}

function createKeyBindings(item) {
  const action = item.querySelector(".customDo").value;
  const key = item.querySelector(".customKey").keyCode;
  const value = Number(item.querySelector(".customValue").value);
  let force = item.querySelector(".customForce").value;

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
    force: force
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
        showMessage("Error: Invalid blacklist regex: \"" + match + "\". Unable to save. Try wrapping it in forward slashes.")
        return false;
      }
    }
  });
  return true;
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

  const successFunction = () => showMessage("Options saved")
  const failureFunction = (reason) => {
    showMessage("An error occurred while trying to save")
    console.log("An error occurred while trying to save,", reason);
  }

  Promise.all([removeKeys, saveOptionsOnChromeStorage])
    .then(successFunction, failureFunction)
    .then(restore_options)

}

// Restores options from chrome.storage
function restore_options() {
  chrome.storage.sync.get(tcDefaults, function (storage) {
    document.querySelectorAll(".row.customs").forEach((item) => item.remove())
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

    for (const item of storage.keyBindings) {
      add_shortcut(item)
    }

  });
}

function restore_defaults() {
  chrome.storage.sync.set(tcDefaults, function () {
    restore_options();
    // Update status to let user know options were saved.
    showMessage("Default options restored")
  });
}

function toggle_show_experimental(forceHide, forceShow) {
  const elements = document.querySelectorAll(".customForce")
  if (elements.length === 0) return

  const firstElementDisplay = elements[0].style.display

  for (let item of elements) {
    if (forceShow) item.style.display = "inline-block"
    else if (forceHide || firstElementDisplay === "inline-block") {
      item.style.display = ""
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
          .then(() => showMessage("Options imported"))
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
  document.getElementById("restore").addEventListener("click", restore_defaults);
  document.getElementById("experimental").addEventListener("click", () => toggle_show_experimental());
  document.getElementById("import").addEventListener("click", importOptions);
  document.getElementById("export").addEventListener("click", exportOptions);

});
