// Two original ridge patterns, printed in misregistered ink on a measured grid.
const plate=document.querySelector('#print');
const brush=plate.getContext('2d');
function fingerprint(x,y,rotation,color,variant){
  const c=brush;c.save();c.translate(x,y);c.rotate(rotation);c.strokeStyle=color;c.lineCap='round';
  for(let ridge=1;ridge<=47;ridge++){
    const r=ridge/47;c.lineWidth=1.55+.75*r;
    c.beginPath();let down=false;
    for(let j=0;j<=380;j++){
      const a=j*Math.PI/190;
      const gap=(ridge%9===0&&j>245&&j<249+ridge%7)||(ridge>22&&ridge%6===2&&j>50&&j<54);
      if(gap){down=false;continue}
      const ripple=(2.5*Math.sin(a*3+r*4+variant)+2*Math.cos(5*a-2*r))*r;
      const xx=(128*r+ripple)*Math.cos(a)*(1-.125*Math.sin(a))+8*Math.sin(2*a)*r+20*Math.pow(r,1.4);
      const yy=(177*r+ripple)*Math.sin(a)+10*r*Math.cos(a*2)-28*Math.pow(1-r,.7)+9*Math.sin(a*2+variant)*r;
      if(down)c.lineTo(xx,yy);else c.moveTo(xx,yy);down=true;
    }
    c.stroke();
  }c.restore();
}
function drawPlate(){
  const width=plate.clientWidth,height=plate.clientHeight;if(!width||!height)return;
  const d=Math.min(window.devicePixelRatio||1,2);plate.width=width*d;plate.height=height*d;
  const c=brush;c.setTransform(plate.width/740,0,0,plate.height/510,0,0);
  c.fillStyle='#e9e7dd';c.fillRect(0,0,740,510);
  c.lineWidth=.65;c.strokeStyle='#c2c2b6';c.beginPath();
  for(let x=0;x<740;x+=25){c.moveTo(x,0);c.lineTo(x,510)}
  for(let y=0;y<510;y+=25){c.moveTo(0,y);c.lineTo(740,y)}c.stroke();
  const drift=Math.min(scrollY/Math.max(1,innerHeight),1)*40;
  c.globalCompositeOperation='multiply';fingerprint(300+drift,264,-.49,'#353930',0);
  fingerprint(437-drift,242,.48,'#ce5329',1.7);c.globalCompositeOperation='source-over';
  c.font='14px monospace';c.fillStyle='#5c5d52';c.fillText('H / 01',36,42);c.fillText('M / 02',646,476);
}
let pending=false;function refreshPlate(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;drawPlate()})}
new ResizeObserver(refreshPlate).observe(plate);addEventListener('scroll',()=>{if(scrollY<innerHeight*1.5)refreshPlate()},{passive:true});
