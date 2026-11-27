/* A field of data becomes an anonymous presence after the rewind. */
function createDataFace(canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const columns = 46, rows = 34;
  const points = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const u = col / (columns - 1) * 2 - 1;
      let headX, headY, keep = true;
      if (row < 29) {
        // Rows of particles bend into an anonymous head, with no facial features.
        headY = -0.98 + row / 28 * 1.96;
        const widthAtRow = Math.sqrt(Math.max(0, 1 - headY * headY));
        headX = u * widthAtRow * (1 - .25 * Math.max(0, headY));
        const stride = widthAtRow < .3 ? 5 : widthAtRow < .5 ? 3 : widthAtRow < .7 ? 2 : 1;
        keep = col % stride === 0;
      } else if (row < 31) {
        headY = 1.04 + (row - 29) * .12;
        headX = u * .29;
        keep = col % 3 === 0;
      } else {
        headY = 1.24 + (row - 31) * .12 + Math.abs(u) * .15;
        headX = u * (0.57 + (row - 31) * .3);
      }
      points.push({
        u, v: row / (rows - 1) * 2 - 1,
        hx: headX, hy: headY, keep,
        phase: row * .21,
        size: 2.5,
        alpha: .72
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
      const u = p.u, v = p.v;
      const wave = Math.sin(u * 3.3 + v * .45 - time * .8) * .075;
      const wx = width * (.5 + u * .39);
      const wy = height * (.49 + v * .30 + wave);
      let hx = cx + p.hx * headWidth * .5;
      let hy = cy + p.hy * headHeight * .5;
      // A soft movement in the lower cloud follows the typed voice, without a drawn mouth.
      if (speaking && !reduced.matches) {
        const voice = Math.exp(-((p.hx / .46) ** 2 + ((p.hy - .48) / .22) ** 2));
        hy += Math.sin(time * 9 + p.phase * .22) * height * .009 * voice;
        hx += Math.sin(time * 7) * width * .003 * voice;
      }
      hx += Math.sin(time * .8 + p.phase) * .7;
      hy += Math.cos(time * .7 + p.phase) * .7;
      const x = wx + (hx - wx) * blend, y = wy + (hy - wy) * blend;
      const opacity = p.alpha * (p.keep ? 1 : 1 - blend);
      if (opacity < .01) continue;
      ctx.fillStyle = `rgba(66, 87, 106, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
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
