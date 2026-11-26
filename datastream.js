/* A field of moving data points gathers into an imagined speaker. */
function createDataFace(canvas) {
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const field = document.createElement('canvas');
  field.width = 360;
  field.height = 500;
  const mask = field.getContext('2d', {willReadFrequently:true});
  let awake = false, speaking = false, blend = 0, start = 0, frame = 0;
  let width = 0, height = 0, visible = true;

  // Draw a portrait as fine contour and feature lines; particles sample this mask.
  mask.strokeStyle = '#885143';
  mask.lineWidth = 1.4;
  mask.lineCap = 'round';
  function line(points) {
    mask.beginPath();
    mask.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 6) {
      mask.bezierCurveTo(...points.slice(i, i + 6));
    }
    mask.stroke();
  }
  // Silhouette, cheeks and jaw.
  line([180,58, 112,52,79,100,82,161, 83,243,102,336,140,379, 158,400,169,407,180,409]);
  line([180,58, 248,52,281,100,278,161, 277,243,258,336,220,379, 202,400,191,407,180,409]);
  for (let j = 0; j < 5; j++) {
    const k = j * 4;
    line([84+k,145, 76+k,219,96+k,321,141+k*.3,370]);
    line([276-k,145, 284-k,219,264-k,321,219-k*.3,370]);
  }
  // Brows, eyes and concentric irises.
  line([105,177, 121,165,146,165,161,176]);
  line([199,176, 214,165,239,165,255,177]);
  for (let k = 0; k < 3; k++) {
    line([105,193+k*2, 121,177+k,145,178+k,160,192+k, 143,204+k,122,204+k,105,193+k*2]);
    line([200,192+k, 215,178+k,239,177+k,255,193+k*2, 238,204+k,217,204+k,200,192+k]);
  }
  for (const x of [133,227]) for (const radius of [4,8,12]) {
    mask.beginPath(); mask.ellipse(x,192,radius,radius*.8,0,0,Math.PI*2); mask.stroke();
  }
  // Nose, philtrum and the closed mouth outline.
  line([175,197, 172,229,164,262,159,274, 167,281,176,283,180,282]);
  line([185,197, 188,229,196,262,201,274, 193,281,184,283,180,282]);
  line([146,322, 158,309,168,313,180,317, 192,313,202,309,214,322]);
  line([146,322, 160,336,200,336,214,322]);
  line([164,292, 172,297,188,297,196,292]);
  // Neck and shoulders lend the face a human silhouette.
  line([138,378, 141,417,125,428,83,443, 64,450,49,463,38,480]);
  line([222,378, 219,417,235,428,277,443, 296,450,311,463,322,480]);
  // Fine horizontal cross-contours build depth in the face.
  for (let y = 94; y < 372; y += 9) {
    const taper = Math.sqrt(Math.max(0, 1 - ((y - 220) / 180) ** 2));
    const span = 90 * taper;
    if (span < 12) continue;
    mask.globalAlpha = .20;
    mask.beginPath();
    mask.moveTo(180-span,y);
    mask.quadraticCurveTo(180,y+10*taper,180+span,y);
    mask.stroke();
  }
  mask.globalAlpha = 1;
  const pixels = mask.getImageData(0,0,360,500).data;
  const targets = [];
  for (let y=40; y<485; y+=3) for (let x=35; x<325; x+=3) {
    const alpha=pixels[(y*360+x)*4+3];
    if (alpha>14) targets.push({x:x/360,y:y/500,a:Math.max(.28,alpha/255)});
  }
  const points = targets.map((target, i) => ({
    target,
    x: ((i*73)%997)/997,
    y: ((i*193+47)%991)/991,
    speed: .015 + (i%9)*.004,
    phase: (i*2.399)%6.283,
    size: .55 + (i%5)*.16
  }));

  function resize() {
    const rect=canvas.getBoundingClientRect();
    width=rect.width; height=rect.height;
    const scale=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    ctx.setTransform(scale,0,0,scale,0,0);
  }
  function draw(timestamp) {
    frame=0;
    if (!visible || !width || !height) return;
    if (!start) start=timestamp;
    const time=(timestamp-start)/1000;
    const desired=awake?1:0;
    blend += (desired-blend)*.025;
    if (Math.abs(desired-blend)<.002) blend=desired;
    ctx.clearRect(0,0,width,height);
    const scale=Math.min(width/360,height/500)*.96;
    const fw=360*scale, fh=500*scale;
    const ox=(width-fw)/2, oy=(height-fh)/2;
    // Glowing threads remain visible beneath the assembled portrait.
    ctx.lineWidth=.65;
    for (let k=0;k<12;k++) {
      const x=width*(.08+k*.075);
      ctx.strokeStyle='rgba(145,91,71,'+(.10+.08*(1-blend))+')';
      ctx.beginPath();
      for (let y=0;y<=height;y+=8) {
        const dx=Math.sin(y*.014+time*(.55+k*.018)+k)*10;
        if(y===0)ctx.moveTo(x+dx,y);else ctx.lineTo(x+dx,y);
      }
      ctx.stroke();
    }
    if (blend > .05) {
      // Keep the features legible while individual data points keep drifting.
      ctx.save();
      ctx.globalAlpha = blend * .62;
      ctx.drawImage(field, ox, oy, fw, fh);
      ctx.restore();
    }
    ctx.save();
    ctx.font = '9px monospace';
    for (let column = 0; column < 8; column++) {
      for (let row = 0; row < 7; row++) {
        const x = width * (.13 + column * .105);
        const y = ((row * 88 + time * (12 + column)) % (height + 25)) - 10;
        const symbol = ((column * 11 + row * 7 + Math.floor(time * 1.5)) % 3) ? '1' : '0';
        ctx.fillStyle = 'rgba(143,76,57,' + (.16 * (1 - blend * .55)) + ')';
        ctx.fillText(symbol, x, y);
      }
    }
    ctx.restore();
    for (const p of points) {
      const fy=((p.y+time*p.speed)%1)*height;
      const fx=(p.x*width + Math.sin(fy*.013+time*.7+p.phase)*9);
      const tx=ox+p.target.x*fw, ty=oy+p.target.y*fh;
      const x=fx+(tx-fx)*blend, y=fy+(ty-fy)*blend;
      ctx.fillStyle='rgba(151,65,45,'+Math.min(.8,.18+p.target.a*.58*blend)+')';
      ctx.fillRect(x,y,p.size,p.size);
    }
    if (blend>.4) {
      const mouthOpen=speaking && !reduced.matches ? 3+Math.abs(Math.sin(time*9))*9 : 1;
      ctx.save();
      ctx.translate(ox,oy);ctx.scale(scale,scale);
      ctx.strokeStyle='rgba(123,52,38,'+(.65*blend)+')';
      ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(147,322);
      ctx.quadraticCurveTo(180,322-mouthOpen*.35,213,322);
      ctx.quadraticCurveTo(180,322+mouthOpen,147,322);ctx.stroke();
      ctx.restore();
    }
    if (!reduced.matches || Math.abs(desired-blend)>.002) frame=requestAnimationFrame(draw);
  }
  function resume(){ if(!frame && visible)frame=requestAnimationFrame(draw); }
  new ResizeObserver(()=>{resize();resume()}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible){start=0;resume()}else{cancelAnimationFrame(frame);frame=0}});
  reduced.addEventListener('change',resume);
  resize();resume();
  return {
    awaken(){awake=true;resume()},
    setSpeaking(value){speaking=value;resume()}
  };
}

const dataFaces = Array.from(document.querySelectorAll('.data-face'), createDataFace);
window.dataVoice = {
  awaken(){dataFaces.forEach(face=>face.awaken())},
  setSpeaking(value){dataFaces.forEach(face=>face.setSpeaking(value))}
};
