/** Seeded paint, one population and staggered morph adapted from the existing
 * SyberLabs site Pointillism source. WebGL draws the denser fine rain in one call.
 */
export const TIMING={earthHold:1.6,earthOut:2.5,rainIn:2.3,rainFull:2.85,resolveStart:4.4,settled:6.4};
const rng32=seed=>()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
export function sampleLayout(elements,W,H){
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.fillStyle='#fff';
  for(const el of elements){
    const r=el.getBoundingClientRect(),s=getComputedStyle(el),fs=parseFloat(s.fontSize);
    x.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;x.textBaseline='alphabetic';
    if(el.tagName==='A'){
      x.lineWidth=1.5;x.beginPath();x.roundRect(r.x,r.y,r.width,r.height,5);x.strokeStyle='#fff';x.stroke();
      const w=x.measureText(el.textContent.trim()).width;x.fillText(el.textContent.trim(),r.x+(r.width-w)/2,r.y+(r.height-fs)/2+fs*.8);
    }else x.fillText(el.textContent.trim(),r.x,r.y+fs*.81);
  }
  const a=x.getImageData(0,0,W,H).data,points=[];
  for(let y=0;y<H;y+=2)for(let px=0;px<W;px+=2)if(a[(y*W+px)*4+3]>90)points.push([px,y]);
  return points;
}
export function mountPointRain(canvas,points,W,H){
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});
  if(!gl||!points.length)return null;
  const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  const vertex=`#version 300 es
  precision highp float;
  layout(location=0)in vec2 start;layout(location=1)in vec2 target;
  layout(location=2)in float speed;layout(location=3)in float seed;
  layout(location=4)in float size;layout(location=5)in float delay;layout(location=6)in float tone;
  uniform float time;uniform vec2 viewport;uniform float dpr;
  out float shade;out float opacity;
  void main(){
    float entry=smoothstep(2.3,2.85,time),fade=1.0-smoothstep(6.1,6.4,time);
    float fallY=mod(start.y+time*speed,viewport.y+80.0)-40.0;
    float originY=mod(start.y+4.4*speed,viewport.y+80.0)-40.0;
    float k=smoothstep(4.4+delay,6.1,time);
    vec2 fall=vec2(start.x+sin(time*.7+seed)*1.8,fallY);
    float travel=speed*.18*(1.0-exp(-max(0.0,time-4.4)/.18));
    vec2 origin=vec2(start.x+sin(4.4*.7+seed)*1.8,originY+travel);
    vec2 p=time<4.4?fall:mix(origin,target,k);
    gl_Position=vec4(p.x/viewport.x*2.0-1.0,1.0-p.y/viewport.y*2.0,0.0,1.0);
    gl_PointSize=size*dpr;shade=tone;opacity=entry*fade*(.38+.5*tone);
  }`;
  const fragment=`#version 300 es
  precision mediump float;in float shade;in float opacity;out vec4 color;
  void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.28,.5,d);
    color=vec4(mix(vec3(.635,.867,.918),vec3(.957,.949,.929),shade),a*opacity);}`;
  function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const r=rng32(0x5eb3),N=W<640?32000:80000,values=new Float32Array(N*9);
  const targets=Array.from({length:N},()=>points[Math.floor(r()*points.length)]).sort((a,b)=>a[1]-b[1]);
  const starts=Array.from({length:N},()=>({x:r()*W,y:r()*(H+80),speed:H*(.8+r()*.7)}));
  starts.sort((a,b)=>(a.y+4.4*a.speed)%(H+80)-(b.y+4.4*b.speed)%(H+80));
  for(let i=0;i<N;i++){
    const o=i*9,s=starts[i],t=targets[i];values.set([s.x,s.y,t[0]+(r()-.5)*1.2,t[1]+(r()-.5)*1.2,s.speed,r()*Math.PI*2,.85+r()*1.15,(t[1]/H)*.18+r()*.16,r()],o);
  }
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);
  for(const[loc,size,offset]of[[0,2,0],[1,2,2],[2,1,4],[3,1,5],[4,1,6],[5,1,7],[6,1,8]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,36,offset*4);}
  gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
  gl.uniform2f(gl.getUniformLocation(program,'viewport'),W,H);gl.uniform1f(gl.getUniformLocation(program,'dpr'),dpr);
  const time=gl.getUniformLocation(program,'time');
  return {count:N,render(t){gl.uniform1f(time,t);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.POINTS,0,N);},destroy(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
