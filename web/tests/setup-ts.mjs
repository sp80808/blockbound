// Registered via `node --import ./tests/setup-ts.mjs`: installs the TS loader
// hooks and stubs the browser surfaces the game adapts to (storage, timers
// and audio stay real; AudioContext simply doesn't exist here, so the sound
// engine degrades to silent no-ops exactly as designed).
import { register } from 'node:module';

register('./ts-loader.mjs', import.meta.url);

const backing = new Map();
globalThis.localStorage = {
  getItem: key => (backing.has(String(key)) ? backing.get(String(key)) : null),
  setItem: (key, value) => backing.set(String(key), String(value)),
  removeItem: key => backing.delete(String(key)),
  clear: () => backing.clear(),
  get length() {
    return backing.size;
  },
  key: index => [...backing.keys()][index] ?? null
};
