/**
 * Keyboard shortcuts — pure matcher so the rules are unit-testable without a
 * DOM. The App shell feeds real KeyboardEvents in; tests feed plain objects.
 * Shortcuts never fire inside modals, buttons, inputs or editable text, so
 * native Space-to-activate and typing are never hijacked or double-handled.
 */

export type HotkeyAction = 'roll' | 'mute';

export interface KeyPress {
  key: string;
  /** Uppercase tagName of e.target ('BUTTON', 'INPUT', 'BODY', ...). */
  targetTag?: string;
  modalOpen: boolean;
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function matchHotkey(press: KeyPress): HotkeyAction | null {
  if (press.modalOpen) return null;
  const tag = (press.targetTag ?? '').toUpperCase();
  if (tag === 'BUTTON' || TYPING_TAGS.has(tag)) return null;
  const key = press.key.toLowerCase();
  if (key === ' ' || key === 'enter' || key === 'r') return 'roll';
  if (key === 'm') return 'mute';
  return null;
}
