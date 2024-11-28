import { showError, showMessage } from "./message-handler.js";
import { regStrip, keyCodeAliases, KEY_MODIFIERS, tcDefaults, disabledCustomActions, customDoOptions } from "./constants.js";

class Settings {

  #ready = false

  #enabled
  #startHidden
  #rememberSpeed
  #forceLastSavedSpeed
  #audioBoolean
  #controllerOpacity
  #blacklist
  #keyBindings

  constructor(options) {
    if (options) this.#init(options)
    else chrome.storage.sync.get(settings => this.#init(settings))
  }

  async init() {
    while (!this.#ready && document.readyState !== 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return this
  }

  #init(options) {
    if (!options) options = tcDefaults;

    this.enabled = options.enabled
    this.startHidden = options.startHidden
    this.rememberSpeed = options.rememberSpeed
    this.forceLastSavedSpeed = options.forceLastSavedSpeed
    this.audioBoolean = options.audioBoolean
    this.controllerOpacity = options.controllerOpacity
    this.blacklist = options.blacklist
    this.keyBindings = options.keyBindings

    this.#ready = true
  }

  get enabled() {
    return this.#enabled
  }
  set enabled(enabled) {
    const element = document.getElementById('enabled')
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.enabled = event.target.checked)
    }
    element.checked = enabled
    this.#enabled = enabled
  }

  get startHidden() {
    return this.#startHidden
  }
  set startHidden(startHidden) {
    const element = document.getElementById("startHidden")
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.startHidden = event.target.checked)
    }
    element.checked = startHidden
    this.#startHidden = startHidden
  }

  get rememberSpeed() {
    return this.#rememberSpeed
  }
  set rememberSpeed(rememberSpeed) {
    const element = document.getElementById("rememberSpeed")
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.rememberSpeed = event.target.checked)
    }
    element.checked = rememberSpeed
    this.#rememberSpeed = rememberSpeed
  }

  get forceLastSavedSpeed() {
    return this.#forceLastSavedSpeed
  }
  set forceLastSavedSpeed(forceLastSavedSpeed) {
    const element = document.getElementById("forceLastSavedSpeed")
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.forceLastSavedSpeed = event.target.checked)
    }
    element.checked = forceLastSavedSpeed
    this.#forceLastSavedSpeed = forceLastSavedSpeed
  }

  get audioBoolean() {
    return this.#audioBoolean
  }
  set audioBoolean(audioBoolean) {
    const element = document.getElementById("audioBoolean")
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.audioBoolean = event.target.checked)
    }
    element.checked = audioBoolean
    this.#audioBoolean = audioBoolean
  }

  get controllerOpacity() {
    return this.#controllerOpacity
  }
  set controllerOpacity(controllerOpacity) {
    const element = document.getElementById("controllerOpacity")
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.controllerOpacity = event.target.value)
      element.addEventListener("keypress", (event) => this.stopPropagationIfNaN(event))
    }
    element.value = controllerOpacity
    this.#controllerOpacity = controllerOpacity
  }

  get blacklist() {
    return this.#blacklist
  }
  set blacklist(blacklist) {
    const element = document.getElementById("blacklist")
    if (!this.#ready) {
      element.addEventListener("change", (event) => this.blacklist = event.target.value)
    }
    element.value = blacklist
    this.#blacklist = blacklist
  }

  get keyBindings() {
    return Array.from(this.#keyBindings.values())
  }
  set keyBindings(keyBindings) {
    if (this.#ready) {
      this.#keyBindings.keys().forEach((element) => element.remove())
    }
    this.#keyBindings = new Map()

    keyBindings.forEach(keyBinding => {
      try {
        this.addKeyBinding(keyBinding)
      } catch (err) {
        showError(`Error on adding KeyBinding: [${err}]`)
      }
    })
  }

  setKeyBind(element, value) {
    this.#keyBindings.set(element, value)
  }

  deleteKeyBind(event) {
    const keyBindElement = event.target.parentElement
    this.#keyBindings.delete(keyBindElement)
    keyBindElement.remove()
  }

  getKeyBind(element) {
    return this.#keyBindings.get(element)
  }

  addKeyBinding(keyBinding) {
    const {action = customDoOptions[0].value, key, modifiers = [], value, force = false} = keyBinding || {}

    const div = createElement('div', {
      attributes: {
        class: "row customs"
      }
    });
    this.setKeyBind(div, {action, key, modifiers, value, force})

    const customDoSelectElement = createElement("select", {
      attributes: {
        class: "customDo"
      },
      options: customDoOptions,
      eventListeners: {
        change: event => {
          const keyBindElement = this.getKeyBind(event.target.parentElement)
          if (disabledCustomActions.includes(event.target.value)) {
            event.target.nextElementSibling.nextElementSibling.disabled = true;
            event.target.nextElementSibling.nextElementSibling.value = 0;
            keyBindElement.value = 0
          } else {
            event.target.nextElementSibling.nextElementSibling.disabled = false;
          }
          keyBindElement.action = event.target.value
        }
      },
      configuration: (element) => {
        if (action !== undefined) {
          element.value = action;
        }
      }
    })
    div.appendChild(customDoSelectElement)
    div.appendChild(document.createTextNode (" "))

    const customKeyElement = createElement("input", {
      attributes: {
        class: "customKey",
        type: "text",
        placeholder: "press a key",
      },
      eventListeners: {
        focus: (event) => this.inputFocus(event),
        keydown: (event) => this.recordKeyPress(event)
      },
      configuration: (element) => {
        element.spellcheck = false;
        if (key !== undefined) {
          element.value = formatKeyCodeAndModifiers(key, modifiers);
          element.keyCode = key;
        }
      }
    });
    div.appendChild(customKeyElement)
    div.appendChild(document.createTextNode (" "))

    const customValueElement = createElement("input", {
      attributes: {
        class: "customValue",
        type: "text",
        placeholder: "value (0.10)",
      },
      eventListeners: {
        change: (event) => this.setKeyBindValue(event),
        keypress: (event) => this.stopPropagationIfNaN(event)
      },
      configuration: (element) => {
        if (value !== undefined) element.value = value
        if (action !== undefined && disabledCustomActions.includes(action)) element.disabled = true;
      }
    });
    div.appendChild(customValueElement)
    div.appendChild(document.createTextNode (" "))

    const customForceSelect = createElement("select", {
      attributes: {
        class: "customForce",
      },
      options: [
        { value: "false", text: "Do not disable website key bindings" },
        { value: "true", text: "Disable website key bindings" }
      ],
      configuration: (element) => {
        if (force !== undefined) element.value = force
      }
    });
    div.appendChild(customForceSelect)
    div.appendChild(document.createTextNode (" "))

    const removeParentButton = createElement("button", {
      attributes: {
        class: "removeParentButton",
      },
      eventListeners: {
        click: (event) => this.deleteKeyBind(event)
      },
      configuration: (element) => {
        element.innerText = "X"
      }
    });
    div.appendChild(removeParentButton)

    const customElement = document.getElementById("customs");
    customElement.insertBefore(
      div,
      document.getElementById("add")
    );
  }

  recordKeyPress(event) {
    const keyCode = event.keyCode
    const keyCodeAlias = keyCodeAliases[keyCode]
    const keyBindElement = event.target.parentElement
    const keyBind = this.getKeyBind(keyBindElement)

    if (keyCodeAlias) {
      event.target.keyCode = keyCode;

      const modifiers = []
      if (event.altKey) modifiers.push(KEY_MODIFIERS.Alt)
      if (event.ctrlKey) modifiers.push(KEY_MODIFIERS.Ctrl)
      if (event.shiftKey) modifiers.push(KEY_MODIFIERS.Shift)

      if (modifiers.length > 0) {
        for (let child of keyBindElement.children) {
          if (child.classList.contains("customForce")) {
            child.value = true
            keyBind.force = true
            break;
          }
        }
        toggleShowExperimental(false, true)
      }

      event.target.value = formatKeyCodeAndModifiers(keyCode, modifiers)
      keyBind.key = keyCode
      keyBind.modifiers = modifiers

      event.preventDefault();
      event.stopPropagation();
    } else if (keyCode === 8) {
      // Clear input when backspace pressed
      event.target.value = "";
      keyBind.key = ""
      keyBind.modifiers = []
    } else if (keyCode === 27) {
      // When esc clicked, clear input
      event.target.value = "null";
      event.target.keyCode = null;

      keyBind.key = "null"
      keyBind.modifiers = []
    }
  }

  stopPropagationIfNaN(event) {
    const char = event.key
    const actualInput = event.target.value
    if (isNaN(actualInput + char)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  setKeyBindValue(event) {
    const keyBind = this.getKeyBind(event.target.parentElement)
    if (keyBind) keyBind.value = Number(event.target.value)
  }

  inputFocus(event) {
    event.target.value = ''
    const keyBindElement = event.target.parentElement
    const keyBind = this.getKeyBind(keyBindElement)
    keyBind.key = ""
    keyBind.modifiers = []
  }

  validate() {
    try {
      this.blacklist.split("\n").forEach((match) => {
        match = match.replace(regStrip, "");

        if (match.startsWith("/")) {
          const parts = match.split("/");

          if (parts.length < 3)
            throw `Invalid blacklist regex: "${match}". Unable to save. Try wrapping it in forward slashes.`;

          // const flags = parts.pop();
          // const regex = parts.slice(1).join("/");
          //
          // const regexp = new RegExp(regex, flags);
        }
      });

      this.keyBindings.forEach((keyBind) => {
        const key = keyBind.key
        if (!key) throw `Invalid key: ${ key }`
      })

    } catch (err) {
      showError(`Validation failed: [${err}]`);
      return false;
    }

    return true;
  }

  save() {
    if (!this.validate()) return;

    const options = {
      rememberSpeed: this.rememberSpeed,
      forceLastSavedSpeed: this.forceLastSavedSpeed,
      audioBoolean: this.audioBoolean,
      enabled: this.enabled,
      startHidden: this.startHidden,
      controllerOpacity: this.controllerOpacity,
      keyBindings: this.keyBindings,
      blacklist: this.blacklist.replace(regStrip, "")
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

    console.log(options)

    const saveOptionsOnChromeStorage = chrome.storage.sync.set(options);

    const successFunction = () => showMessage("Options saved")
    const failureFunction = (reason) => {
      showMessage("An error occurred while trying to save")
      console.log("An error occurred while trying to save,", reason);
    }

    Promise.all([removeKeys, saveOptionsOnChromeStorage])
      .then(successFunction, failureFunction)
      .then(() => this.restoreOptions())

  }

  restoreOptions() {
    chrome.storage.sync.get(tcDefaults, (storage) => {
      this.#init(storage)
    });
  }

  restoreDefaults() {
    chrome.storage.sync.set(tcDefaults, () => {
      this.restoreOptions();
      showMessage("Default options restored")
    });
  }

  importOptions = () => {
    const input = createElement("input");
    input.type = "file"

    const onchange = (event) => {
      const files = event.target.files;

      if (files.length > 0) {
        const file = files[0];

        const reader = new FileReader();
        reader.onload = (e) => {
          const options = JSON.parse(e.target.result);

          chrome.storage.sync.set(options)
            .then(() => this.restoreOptions())
            .then(() => showMessage("Options imported"))
        };

        reader.readAsText(file);
      }
    }

    input.addEventListener("change", onchange);
    input.click()
    input.remove()

  }

  exportOptions = async () => {
    const options = await chrome.storage.sync.get(tcDefaults)
    jsonToFileAndDownload(options, "video-speed-controller-options")
  }


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

const createElement = (tagName, options) => {
  const element = document.createElement(tagName);
  if (!options) return element

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([qualifiedName, value]) => {
      element.setAttribute(qualifiedName, value)
    })
  }

  if (options.options) {
    for (let option of options.options) {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.text = option.text;
      element.add(optionElement)
    }
  }

  if (options.eventListeners) {
    Object.entries(options.eventListeners).forEach(([type, listener]) => {
      element.addEventListener(type, listener)
    })
  }

  if (options.configuration) options.configuration(element)

  return element
}


function toggleShowExperimental(forceHide, forceShow) {
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

const jsonToFileAndDownload = (obj, filename) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();

  a.remove()
  URL.revokeObjectURL(url);
};

document.addEventListener("DOMContentLoaded", () => {
    new Settings().init().then((settings) => {
      document.getElementById("save").addEventListener("click", () => settings.save());
      document.getElementById("add").addEventListener("click", () => settings.addKeyBinding());
      document.getElementById("restore").addEventListener("click", () => settings.restoreDefaults());
      document.getElementById("experimental").addEventListener("click", () => toggleShowExperimental());
      document.getElementById("import").addEventListener("click", () => settings.importOptions());
      document.getElementById("export").addEventListener("click", () => settings.exportOptions());
  })

});
