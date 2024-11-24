const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

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
    { action: "display", key: 86, value: 0, force: false }, // V
    { action: "slower", key: 83, value: 0.1, force: false }, // S
    { action: "faster", key: 68, value: 0.1, force: false }, // D
    { action: "rewind", key: 90, value: 10, force: false }, // Z
    { action: "advance", key: 88, value: 10, force: false }, // X
    { action: "reset", key: 82, value: 1, force: false }, // R
    { action: "fast", key: 71, value: 1.8, force: false } // G
  ],
  blacklist: `www.instagram.com
    twitter.com
    imgur.com
    teams.microsoft.com
  `.replace(regStrip, "")
};

const disabledCustomActions = ["pause", "muted", "mark", "jump", "display"];

const customDoOptions = [
  { value: "slower", text: "Decrease speed" },
  { value: "faster", text: "Increase speed" },
  { value: "rewind", text: "Rewind" },
  { value: "advance", text: "Advance" },
  { value: "reset", text: "Reset speed" },
  { value: "fast", text: "Preferred speed" },
  { value: "muted", text: "Mute" },
  { value: "softer", text: "Decrease volume" },
  { value: "louder", text: "Increase volume" },
  { value: "pause", text: "Pause" },
  { value: "mark", text: "Set marker" },
  { value: "jump", text: "Jump to marker" },
  { value: "display", text: "Show/hide controller" }
]

export { regStrip, keyCodeAliases, KEY_MODIFIERS, tcDefaults, disabledCustomActions, customDoOptions }