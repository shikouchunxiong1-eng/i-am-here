function createScrollMotion(count, blocked, takeOver) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const echo = document.querySelector('#proxyCursor');
  const paper = document.querySelector('#paper');
  let index = 0, pending = 0, fraction = 0, animation = 0, previousTime = 0;
  let distance = 0, nextTug = null, furthest = 0, pulls = 0;
  let takeover = false, touch = null, mouse = null, tug = null;

  function clearMotion() {
    cancelAnimationFrame(animation);
    animation = previousTime = pending = fraction = distance = 0;
    tug = null;
    echo.hidden = true;
  }
  function queue() {
    if (!animation && !document.hidden && !blocked()) animation = requestAnimationFrame(step);
  }
  function move(pixels) {
    fraction += pixels;
    const amount = Math.trunc(fraction);
    fraction -= amount;
    if (amount) window.scrollBy({top: amount, behavior: 'instant'});
  }
  function step(now) {
    animation = 0;
    if (blocked() || document.hidden) { clearMotion(); return; }
    const dt = previousTime ? Math.min(now - previousTime, 40) : 16;
    previousTime = now;
    if (takeover) {
      if (reduced.matches) window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'});
      else move(dt * Math.max(0.42, innerHeight / 1800));
    } else if (tug) {
      const before = tug.elapsed / tug.duration;
      tug.elapsed = Math.min(tug.duration, tug.elapsed + dt);
      const after = tug.elapsed / tug.duration;
      move(tug.distance * (Math.cos(Math.PI * after) - Math.cos(Math.PI * before)) / 2);
      if (mouse) {
        const drift = Math.sin(after * Math.PI) * tug.intensity;
        echo.hidden = false;
        echo.style.transform = 'translate(' + (mouse.x + 5 + 45 * drift) + 'px,' + (mouse.y + 3 + 75 * drift) + 'px)';
      }
      if (after === 1) { tug = null; echo.hidden = true; }
    } else {
      const applied = pending * (1 - Math.exp(-dt / (42 + 125 * intensity())));
      pending -= applied;
      move(applied);
    }
    if ((takeover && !reduced.matches) || tug || Math.abs(pending) >= 0.5) queue();
    else { previousTime = 0; pending = 0; }
  }

  function intensity() {
    return Math.max(0, (index / (count - 1) - 0.12) / 0.88);
  }
  function update(current) {
    index = current;
    if (blocked()) return;
    if (!takeover && index >= count - 6) {
      clearMotion();
      takeover = true;
      takeOver();
    }
    if (takeover) queue();
  }
  function drive(delta, event) {
    if (!Number.isFinite(delta) || delta === 0 || blocked() || reduced.matches || !event.cancelable) return;
    const drag = intensity();
    if (!drag || takeover) return;
    if (delta < 0 && drag < 0.58) { clearMotion(); return; }

    event.preventDefault();
    const cap = innerHeight * 0.65;
    const gain = delta < 0 ? 1 - 0.55 * drag : 1 - 0.88 * drag;
    pending = Math.max(-cap, Math.min(cap, pending + delta * gain));
    if (delta > 0 && drag > 0.2 && !tug && window.scrollY > furthest + innerHeight * 0.32) {
      // Count forward intent, with shorter intervals and larger recoils deeper down.
      distance += Math.min(delta, innerHeight);
      nextTug ??= innerHeight * (2.4 - 1.8 * drag);
      if (distance >= nextTug) {
        furthest = window.scrollY;
        distance = 0;
        const variation = [1.22, 0.83, 1.09, 0.71, 1.34][pulls++ % 5];
        nextTug = null;
        const size = innerHeight * (0.015 + 0.31 * drag ** 2) * variation;
        tug = {elapsed: 0, duration: 175 + 420 * drag ** 1.5, distance: size, intensity: drag};
        // Keep enough of a large gesture to retake the ground it just lost.
        pending = Math.min(cap, pending * (1 - 0.48 * drag));
      }
    }
    queue();
  }

  paper.addEventListener('wheel', event => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (Number.isFinite(event.clientX)) mouse = {x: event.clientX, y: event.clientY};
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    drive(event.deltaY * unit, event);
  }, {passive: false});
  paper.addEventListener('pointermove', event => {
    mouse = event.pointerType === 'mouse' ? {x: event.clientX, y: event.clientY} : null;
  }, {passive: true});
  paper.addEventListener('touchstart', event => {
    touch = event.touches.length === 1 ? event.touches[0] : null;
    mouse = null;
  }, {passive: true});
  paper.addEventListener('touchmove', event => {
    if (event.touches.length !== 1 || !touch) { touch = null; return; }
    const point = event.touches[0];
    const dy = touch.clientY - point.clientY, dx = touch.clientX - point.clientX;
    touch = point;
    if (Math.abs(dy) >= Math.abs(dx)) drive(dy, event);
  }, {passive: false});
  document.addEventListener('keydown', event => {
    if (takeover || blocked() || event.altKey || event.metaKey || event.ctrlKey || event.defaultPrevented) return;
    if (event.target.closest('button, a, input, textarea, select, [contenteditable=true]')) return;
    const units = {ArrowDown: 48, PageDown: innerHeight * 0.85, ' ': innerHeight * 0.85,
      ArrowUp: -48, PageUp: -innerHeight};
    const delta = units[event.key];
    drive(event.shiftKey && event.key === ' ' ? -delta : delta, event);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearMotion();
    else if (takeover) queue();
  });
  reduced.addEventListener('change', () => {
    clearMotion();
    if (takeover) queue();
  });
  return {update, stop: clearMotion};
}
