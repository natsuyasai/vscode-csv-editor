// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
const nonInputKeys = new Set([
  // Special keys
  "Unidentified",
  // Modifier keys
  "Alt",
  "AltGraph",
  "CapsLock",
  "Control",
  "Fn",
  "FnLock",
  "Meta",
  "NumLock",
  "ScrollLock",
  "Shift",
  // Whitespace keys
  "Tab",
  // Navigation keys
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  // Editing
  "Insert",
  // UI keys
  "ContextMenu",
  "Escape",
  "Pause",
  "Play",
  // Device keys
  "PrintScreen",
  // Function keys
  "F1",
  // 'F2', /!\ specifically allowed, do not edit
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
]);

export function canEdit(e: KeyboardEvent) {
  if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.repeat) {
    return false;
  }
  return !nonInputKeys.has(e.key);
}
