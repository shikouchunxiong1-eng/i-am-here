/* A field of data becomes an anonymous presence after the rewind. */
function createDataFace(canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['84, 102, 192', '104, 91, 172', '142, 83, 149', '183, 82, 92', '200, 130, 75'];
  const columns = 70, rows = 52;
  const points = [];
  const fract = value => value - Math.floor(value);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const i = row * columns + col;
      const random = fract(Math.sin(i * 12.9898 + 78.233) * 43758.5453);
      const random2 = fract(Math.sin(i * 43.713 + 4.321) * 23758.5453);
      const angle = i * 2.3999632297;
      const radius = Math.sqrt((i + .5) / (columns * rows));
      // The outline is made of particles, without drawing anatomical features.
      const rim = i % 5 === 0;
      const r = rim ? .96 + random * .04 : radius * .96;
      const faceY = Math.sin(angle) * r;
      const taper = 1 - .28 * Math.max(0, faceY);
      let headX = Math.cos(angle) * r * taper, headY = faceY;
      // A small scatter around the neck and shoulders makes the silhouette human.
      if (i % 9 === 0) {
        if (random < .45) {
          headX = (random2 < .5 ? -1 : 1) * (.31 + random * .10);
          headY = .82 + (random2 * 2 % 1) * .45;
        } else {
          headX = (random2 * 2 - 1) * 1.22;
          headY = 1.15 + Math.abs(headX) * .22 + (random - .5) * .10;
        }
      }
      points.push({
        u: (col + random * .7) / (columns - 1),
        v: (row + random2 * .65) / (rows - 1),
        hx: headX,
        hy: headY,
        phase: random * Math.PI * 2,
        size: .65 + random2 * 1.15,
        alpha: .42 + random * .45,
        color: colors[Math.min(colors.length - 1, Math.floor((col / columns * .7 + random * .3) * colors.length))]
      });
    }
  }
  let awake = false, speaking = false, blend = 0, start = 0, previous = 0, frame = 0;
  let width = 0, height = 0, visible = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function draw(timestamp) {
    frame = 0;
    if (!visible || !width || !height) return;
    if (!start) start = timestamp;
    const time = reduced.matches ? 0 : (timestamp - start) / 1000;
    const desired = awake ? 1 : 0;
    const elapsed = previous ? Math.min((timestamp - previous) / 1000, .12) : 0;
    previous = timestamp;
    blend = reduced.matches ? desired : blend + (desired - blend) * (1 - Math.exp(-elapsed * 1.6));
    if (Math.abs(desired - blend) < .002) blend = desired;
    ctx.clearRect(0, 0, width, height);
    const headWidth = Math.min(width * .74, height * .51);
    const headHeight = Math.min(height * .68, width * .92);
    const cx = width * .5, cy = height * .48;
    for (const p of points) {
      // Layered travelling waves create the impression of a flowing particle surface.
      const u = p.u * 2 - 1, v = p.v;
      const wave = Math.sin(u * 5.2 + v * 7.5 - time * 1.1) * .035
        + Math.sin(u * 9 - v * 5 + time * .72) * .018;
      const wx = width * (.5 + u * (.43 + .055 * v) + Math.sin(v * 9 - time * .7 + p.phase) * .008);
      const wy = height * (.08 + v * .82 + wave);
      let hx = cx + p.hx * headWidth * .5;
      let hy = cy + p.hy * headHeight * .5;
      // A soft movement in the lower cloud follows the typed voice, without a drawn mouth.
      if (speaking && !reduced.matches) {
        const voice = Math.exp(-((p.hx / .46) ** 2 + ((p.hy - .48) / .22) ** 2));
        hy += Math.sin(time * 9 + p.phase * .22) * height * .009 * voice;
        hx += Math.sin(time * 7) * width * .003 * voice;
      }
      hx += Math.sin(time * .9 + p.phase) * 1.5;
      hy += Math.cos(time * .8 + p.phase) * 1.5;
      const x = wx + (hx - wx) * blend, y = wy + (hy - wy) * blend;
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      const length = p.size * (1.2 + (1 - blend) * .7);
      ctx.fillRect(x - length / 2, y - p.size * .34, length, Math.max(.7, p.size * .68));
    }
    if (!reduced.matches || blend !== desired) frame = requestAnimationFrame(draw);
  }
  function resume() { if (!frame && visible) frame = requestAnimationFrame(draw); }
  new ResizeObserver(() => { resize(); resume(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) { start = 0; previous = 0; resume(); }
    else { cancelAnimationFrame(frame); frame = 0; }
  });
  reduced.addEventListener('change', resume);
  resize(); resume();
  return {
    awaken() { awake = true; resume(); },
    setSpeaking(value) { speaking = value; resume(); }
  };
}

const dataFaces = Array.from(document.querySelectorAll('.data-face'), createDataFace);
window.dataVoice = {
  awaken() { dataFaces.forEach(face => face.awaken()); },
  setSpeaking(value) { dataFaces.forEach(face => face.setSpeaking(value)); }
};
