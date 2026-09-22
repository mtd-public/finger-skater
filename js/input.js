// One-thumb controls. Every touch is both a steer and a "hold":
//   - drag (while held): weave left/right, relative to where you touched
//   - hold on the ground: charge an ollie; release to jump (longer = higher)
//   - hold in the air: grab the board (trick); release before you land!
// Keyboard: ←/→ or A/D weave, Space (or ↑/W) is the hold.
// main.js decides what a hold means; this only reports presses and releases.
export class Input {
  constructor(el) {
    this.el = el;
    this.pointerId = null;
    this.lastX = 0;
    this.dragPx = 0; // horizontal drag since the last read()
    this.holdStart = 0; // performance.now() when the current hold began, 0 = not holding
    this.queue = []; // 'press' | 'release' | 'cancel', in order
    this.keys = new Set();
    this.enabled = false;

    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.pointerId !== null) return;
      e.preventDefault();
      this.pointerId = e.pointerId;
      this.lastX = e.clientX;
      this._press();
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.dragPx += e.clientX - this.lastX;
      this.lastX = e.clientX;
    });
    const up = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      if (!this._keyHeld()) this._release(e.type === 'pointerup' ? 'release' : 'cancel');
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
      if (!this.enabled || e.repeat) return;
      this.keys.add(k);
      if (HOLD_KEYS.includes(k)) this._press();
    });
    addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (HOLD_KEYS.includes(k) && this.pointerId === null && !this._keyHeld()) this._release('release');
    });
    addEventListener('blur', () => this.reset());
  }

  _keyHeld() { return HOLD_KEYS.some((j) => this.keys.has(j)); }

  _press() {
    if (this.holdStart) return;
    this.holdStart = performance.now();
    this.queue.push('press');
  }

  _release(kind) {
    if (!this.holdStart) return;
    this.holdStart = 0;
    this.queue.push(kind);
  }

  get holding() { return this.holdStart !== 0; }

  // Keyboard steer axis (-1..1).
  get keyAxis() {
    const k = this.keys;
    return ((k.has('arrowright') || k.has('d')) ? 1 : 0) - ((k.has('arrowleft') || k.has('a')) ? 1 : 0);
  }

  get speedAxis() {
    const k = this.keys;
    return (k.has('arrowdown') || k.has('s')) ? -1 : 0;
  }

  read() {
    const out = { dragPx: this.dragPx, events: this.queue.splice(0) };
    this.dragPx = 0;
    return out;
  }

  reset() {
    this.pointerId = null;
    this.holdStart = 0;
    this.dragPx = 0;
    this.queue = [];
    this.keys.clear();
  }
}

const HOLD_KEYS = [' ', 'arrowup', 'w'];
