(() => {
  'use strict';

  type SceneName = 'flight'|'day'|'city'|'dining'|'beach'|'studio'|'premiere'|'moment'|'cloud';
  type SceneOptions = { mood?: number };

  const VERT = `#version 300 es
  in vec2 a_pos;
  out vec2 v_uv;
  void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}`;

  const FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform vec2 u_res; uniform float u_time; uniform float u_mode; uniform vec2 u_pointer;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
  float sdCircle(vec2 p,float r){return length(p)-r;}
  float sdBox(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
  vec3 sky(vec2 uv){float y=uv.y;vec3 c=mix(vec3(.83,.93,.98),vec3(.28,.66,.86),smoothstep(0.,1.,y));float cl=fbm(vec2(uv.x*3.+u_time*.008,uv.y*5.));float cloud=smoothstep(.62,.84,cl)*(1.-smoothstep(.66,1.,uv.y));c=mix(c,vec3(1.),cloud*.72);return c;}
  vec3 flight(vec2 uv){vec3 c=mix(vec3(.88,.96,.99),vec3(.31,.69,.88),smoothstep(0.,1.,uv.y));float t=u_time*.018;vec2 p1=vec2(fract(.12+t),.78+.05*sin(u_time*.07));vec2 p2=vec2(fract(.58+t*.72),.60+.06*sin(u_time*.05+1.7));vec2 p3=vec2(fract(.86+t*.48),.86+.03*sin(u_time*.04+2.4));float e1=length((uv-p1)*vec2(1.0,3.2));float e2=length((uv-p2)*vec2(1.0,3.8));float e3=length((uv-p3)*vec2(1.0,4.2));float cl=(1.-smoothstep(.10,.24,e1))*.34+(1.-smoothstep(.09,.22,e2))*.27+(1.-smoothstep(.08,.20,e3))*.22;c=mix(c,vec3(1.),cl);float haze=pow(max(0.,1.-uv.y),3.);c+=vec3(.12,.07,.03)*haze;return c;}
  vec3 dining(vec2 uv){vec2 p=uv-.5;float grain=fbm(vec2(uv.x*18.,uv.y*8.));vec3 wood=mix(vec3(.24,.095,.045),vec3(.52,.24,.12),grain);float plate=sdCircle(vec2(p.x*1.35,p.y),.235);float rim=smoothstep(.018,-.018,abs(plate)-.018);float inner=smoothstep(.02,-.02,plate+.055);vec3 c=wood;c=mix(c,vec3(.94,.92,.86),inner*.98);c=mix(c,vec3(.78,.74,.66),rim*.8);float shadow=smoothstep(.10,-.02,sdCircle(vec2((p.x-.012)*1.35,p.y+.025),.27));c*=1.-shadow*.18;float glass=sdCircle(vec2((p.x-.28)*1.35,p.y+.13),.08);c=mix(c,vec3(.82,.94,1.),smoothstep(.01,-.01,glass)*.20);float cut=sdBox(vec2(p.x+.32,p.y),vec2(.012,.26));c=mix(c,vec3(.72,.70,.65),smoothstep(.008,-.008,cut));float lamp=1.-smoothstep(.0,.7,length(p-vec2(-.25,.22)));c+=vec3(.14,.07,.02)*lamp;return c;}
  vec3 beach(vec2 uv){float horizon=.57+.012*sin(uv.x*11.+u_time*.35)+.006*sin(uv.x*31.-u_time*.7);vec3 water=mix(vec3(.02,.36,.52),vec3(.11,.70,.78),uv.y);float wave=sin(uv.x*32.+u_time*1.3)+sin(uv.x*73.-u_time*.9)*.35;water+=vec3(.07,.12,.14)*wave*.08;float sandN=fbm(uv*vec2(35.,18.));vec3 sand=mix(vec3(.80,.58,.31),vec3(.96,.82,.57),sandN);float beachEdge=horizon+.025*sin(uv.x*13.+u_time*.45);vec3 c=uv.y>beachEdge?water:sand;float foam=1.-smoothstep(.0,.028,abs(uv.y-beachEdge));foam*=.75+.25*sin(uv.x*80.+u_time*2.2);c=mix(c,vec3(.96,.98,.97),foam*.78);if(uv.y>.9)c=mix(c,sky(vec2(uv.x,(uv.y-.9)*8.)),.35);return c;}
  vec3 city(vec2 uv){vec3 c=mix(vec3(.98,.72,.48),vec3(.36,.52,.75),uv.y);float ground=.34; if(uv.y<ground){c=vec3(.10,.12,.16);float x=uv.x*36.;float id=floor(x);float h=.08+hash(vec2(id,1.))*.22;if(uv.y<ground+h)c=mix(c,vec3(.06,.07,.10),.8);float win=step(.72,hash(floor(vec2(x*2.,uv.y*75.))+4.));c+=vec3(.95,.62,.25)*win*.28;}float sun=1.-smoothstep(.0,.16,length(uv-vec2(.78,.72)));c+=vec3(.45,.22,.06)*sun*.5;return c;}
  vec3 studio(vec2 uv){vec2 p=uv-.5;vec3 c=mix(vec3(.035,.03,.045),vec3(.12,.08,.11),uv.y);float beam=max(0.,1.-abs(p.x+p.y*.35)*2.6);c+=vec3(.20,.09,.14)*beam*.28;float floorGlow=exp(-8.*abs(uv.y-.14));c+=vec3(.30,.16,.09)*floorGlow*.16;float grain=(hash(gl_FragCoord.xy+u_time)-.5)*.025;c+=grain;return c;}
  vec3 cloudScene(vec2 uv){vec3 c=sky(uv);float glow=1.-smoothstep(0.,.55,length(uv-vec2(.5,.52)));c+=vec3(.12,.07,.10)*glow*.12;return c;}
  vec3 premiere(vec2 uv){vec3 c=studio(uv);float vign=smoothstep(.2,.78,length(uv-.5));c*=1.-vign*.55;float gold=exp(-18.*length(uv-vec2(.18,.82)));c+=vec3(.34,.22,.06)*gold;return c;}
  void main(){vec2 uv=v_uv;uv.x+=(u_pointer.x-.5)*.015;uv.y+=(u_pointer.y-.5)*.01;vec3 c;
    if(u_mode<.5)c=flight(uv);else if(u_mode<1.5)c=flight(uv);else if(u_mode<2.5)c=city(uv);else if(u_mode<3.5)c=dining(uv);else if(u_mode<4.5)c=beach(uv);else if(u_mode<5.5)c=studio(uv);else if(u_mode<6.5)c=premiere(uv);else c=cloudScene(uv);
    outColor=vec4(pow(c,vec3(.94)),1.);
  }`;

  const modeFor:Record<SceneName,number>={flight:0,day:1,city:2,dining:3,beach:4,studio:5,premiere:6,moment:7,cloud:7};

  function compile(gl:WebGL2RenderingContext,type:number,src:string){const sh=gl.createShader(type)!;gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Shader error');return sh;}
  function program(gl:WebGL2RenderingContext){const p=gl.createProgram()!;gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERT));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Program error');return p;}

  class MemoryRenderEngine {
    host:HTMLElement; glCanvas:HTMLCanvasElement; overlay:HTMLCanvasElement; gl:WebGL2RenderingContext; ctx:CanvasRenderingContext2D; prog:WebGLProgram;
    start=performance.now(); mode=0; raf=0; flightEpoch=performance.now(); flightDuration=8600; pointer={x:.5,y:.5}; ro:ResizeObserver;
    uTime:WebGLUniformLocation|null;uRes:WebGLUniformLocation|null;uMode:WebGLUniformLocation|null;uPointer:WebGLUniformLocation|null;
    constructor(host:HTMLElement){this.host=host;host.innerHTML='';this.glCanvas=document.createElement('canvas');this.overlay=document.createElement('canvas');this.glCanvas.className='mr-webgl';this.overlay.className='mr-overlay';host.append(this.glCanvas,this.overlay);const gl=this.glCanvas.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});if(!gl)throw new Error('WebGL2 wird auf diesem Gerät nicht unterstützt.');this.gl=gl;const c=this.overlay.getContext('2d');if(!c)throw new Error('Canvas wird nicht unterstützt.');this.ctx=c;this.prog=program(gl);gl.useProgram(this.prog);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.prog,'a_pos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);this.uTime=gl.getUniformLocation(this.prog,'u_time');this.uRes=gl.getUniformLocation(this.prog,'u_res');this.uMode=gl.getUniformLocation(this.prog,'u_mode');this.uPointer=gl.getUniformLocation(this.prog,'u_pointer');this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();this.pointer.x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));this.pointer.y=Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height));},{passive:true});this.resize();this.loop();}
    resize(){const d=Math.min(2,window.devicePixelRatio||1),r=this.host.getBoundingClientRect(),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));for(const c of [this.glCanvas,this.overlay]){if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;c.style.width=r.width+'px';c.style.height=r.height+'px';}this.gl.viewport(0,0,w,h);}
    setScene(name:SceneName,opts:SceneOptions={}){this.mode=modeFor[name]??0;this.host.dataset.renderScene=name;}
    flightPoint(t:number,cycle:number){const seed=cycle*1.913+.73;const x=-.12+t*1.24+Math.sin((t*2+seed)*Math.PI)*.018;const y=.48+Math.sin(t*Math.PI*2+seed)*.18+Math.sin(t*Math.PI*4.7+seed*1.31)*.075+Math.sin(t*Math.PI*8.3+seed*.47)*.025;return{x,y:Math.max(.15,Math.min(.82,y))};}
    drawRoute(now:number){const x=this.ctx,w=this.overlay.width,d=w/Math.max(1,this.host.clientWidth);x.clearRect(0,0,this.overlay.width,this.overlay.height);if(!(this.mode===0||this.mode===1))return;const elapsed=Math.max(0,now-this.flightEpoch),cycle=Math.floor(elapsed/this.flightDuration),p=(elapsed%this.flightDuration)/this.flightDuration;x.save();x.scale(d,d);const cw=this.host.clientWidth,ch=this.host.clientHeight,tailStart=Math.max(0,p-.24),steps=34;for(let i=1;i<steps;i++){const a=tailStart+(p-tailStart)*((i-1)/(steps-1)),b=tailStart+(p-tailStart)*(i/(steps-1)),qa=this.flightPoint(a,cycle),qb=this.flightPoint(b,cycle),alpha=.05+.43*(i/steps);x.beginPath();x.moveTo(qa.x*cw,qa.y*ch);x.lineTo(qb.x*cw,qb.y*ch);x.strokeStyle=`rgba(255,255,255,${alpha})`;x.lineWidth=2;x.stroke()}const q=this.flightPoint(p,cycle),q2=this.flightPoint(Math.min(1,p+.004),cycle),ang=Math.atan2((q2.y-q.y)*ch,(q2.x-q.x)*cw);x.translate(q.x*cw,q.y*ch);x.rotate(ang);x.fillStyle='rgba(28,42,58,.96)';x.beginPath();x.moveTo(20,0);x.lineTo(-7,-5);x.lineTo(-18,-16);x.lineTo(-22,-14);x.lineTo(-14,-3);x.lineTo(-19,0);x.lineTo(-14,3);x.lineTo(-22,14);x.lineTo(-18,16);x.lineTo(-7,5);x.closePath();x.fill();x.restore();}
    loop=()=>{const now=performance.now();const gl=this.gl;gl.useProgram(this.prog);gl.uniform1f(this.uTime,(now-this.start)/1000);gl.uniform2f(this.uRes,this.glCanvas.width,this.glCanvas.height);gl.uniform1f(this.uMode,this.mode);gl.uniform2f(this.uPointer,this.pointer.x,this.pointer.y);gl.drawArrays(gl.TRIANGLES,0,6);this.drawRoute(now);this.raf=requestAnimationFrame(this.loop);};
    destroy(){cancelAnimationFrame(this.raf);this.ro.disconnect();this.host.innerHTML='';}
  }

  (window as any).LuviaMemoryRenderEngine=Object.freeze({version:'1.0.0',create:(host:HTMLElement)=>new MemoryRenderEngine(host)});
})();
