// Small, bounded 2D fluid simulation. The field stores pigment, never page content.
export const vertex = `#version 300 es
precision highp float;
out vec2 uv;
void main(){
  vec2 p=vec2((gl_VertexID << 1) & 2,gl_VertexID & 2);
  uv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;

const header = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 result;
uniform sampler2D source;
uniform sampler2D velocity;
uniform sampler2D extra;
uniform vec2 texel;
uniform float dt;
float resting(vec2 p){
  return clamp(p.x*.74+(1.0-p.y)*.26+.10*sin(p.x*5.0+p.y*5.5)
    +.055*sin(p.y*10.0-p.x*3.0),.02,.98);
}
`;

export const shaders = {
  initialize: header + `void main(){result=vec4(resting(uv),0,0,1);}`,
  advect: header + `uniform float fade;
    uniform float pigment;
    void main(){
      vec2 v=texture(velocity,uv).xy;
      vec4 previous=texture(source,clamp(uv-v*dt,vec2(0),vec2(1)));
      vec4 base=vec4(resting(uv),0,0,1)*pigment;
      result=mix(base,previous,exp(-fade*dt));
    }`,
  splat: header + `uniform vec2 point;
    uniform vec2 force;
    uniform float aspect;
    uniform float radius;
    uniform float ink;
    uniform float pigment;
    uniform float strength;
    void main(){
      vec2 p=uv-point;p.x*=aspect;
      float brush=exp(-dot(p,p)/(radius*radius));
      vec4 field=texture(source,uv);
      if(pigment>.5){field.x=mix(field.x,ink,brush*strength);}
      else {field.xy=clamp(field.xy+force*brush,vec2(-2),vec2(2));}
      result=field;
    }`,
  curl: header + `void main(){
    float l=texture(source,uv-vec2(texel.x,0)).y;
    float r=texture(source,uv+vec2(texel.x,0)).y;
    float b=texture(source,uv-vec2(0,texel.y)).x;
    float t=texture(source,uv+vec2(0,texel.y)).x;
    result=vec4(.5*(r-l-t+b),0,0,1);
  }`,
  confine: header + `void main(){
    float l=texture(extra,uv-vec2(texel.x,0)).x;
    float r=texture(extra,uv+vec2(texel.x,0)).x;
    float b=texture(extra,uv-vec2(0,texel.y)).x;
    float t=texture(extra,uv+vec2(0,texel.y)).x;
    float c=texture(extra,uv).x;
    vec2 f=.5*vec2(abs(t)-abs(b),abs(r)-abs(l));
    f/=length(f)+.00001;f*=c*22.0;f.y*=-1.0;
    result=vec4(clamp(texture(source,uv).xy+f*dt,vec2(-2),vec2(2)),0,1);
  }`,
  divergence: header + `void main(){
    vec2 c=texture(source,uv).xy;
    float l=texture(source,uv-vec2(texel.x,0)).x;
    float r=texture(source,uv+vec2(texel.x,0)).x;
    float b=texture(source,uv-vec2(0,texel.y)).y;
    float t=texture(source,uv+vec2(0,texel.y)).y;
    if(uv.x<texel.x)l=-c.x;if(uv.x>1.0-texel.x)r=-c.x;
    if(uv.y<texel.y)b=-c.y;if(uv.y>1.0-texel.y)t=-c.y;
    result=vec4(.5*(r-l+t-b),0,0,1);
  }`,
  pressure: header + `void main(){
    float l=texture(source,uv-vec2(texel.x,0)).x;
    float r=texture(source,uv+vec2(texel.x,0)).x;
    float b=texture(source,uv-vec2(0,texel.y)).x;
    float t=texture(source,uv+vec2(0,texel.y)).x;
    result=vec4((l+r+b+t-texture(extra,uv).x)*.25,0,0,1);
  }`,
  project: header + `void main(){
    float l=texture(extra,uv-vec2(texel.x,0)).x;
    float r=texture(extra,uv+vec2(texel.x,0)).x;
    float b=texture(extra,uv-vec2(0,texel.y)).x;
    float t=texture(extra,uv+vec2(0,texel.y)).x;
    result=vec4(texture(source,uv).xy-.5*vec2(r-l,t-b),0,1);
  }`,
  display: header + `void main(){
    float field=texture(source,uv).x;
    float l=texture(source,uv-vec2(texel.x*2.0,0)).x;
    float r=texture(source,uv+vec2(texel.x*2.0,0)).x;
    float b=texture(source,uv-vec2(0,texel.y*2.0)).x;
    float t=texture(source,uv+vec2(0,texel.y*2.0)).x;
    float pigment=smoothstep(.04,.96,field);
    vec3 lime=vec3(220,243,99)/255.0;
    vec3 mint=vec3(169,227,154)/255.0;
    vec3 teal=vec3(104,203,176)/255.0;
    vec3 color=mix(lime,mint,smoothstep(0.0,.56,pigment));
    color=mix(color,teal,smoothstep(.40,1.0,pigment));
    vec2 slope=vec2(l-r,b-t);
    float edge=clamp(length(slope)*15.0,0.0,1.0);
    vec3 normal=normalize(vec3(slope*9.0,1.0));
    float sheen=pow(max(dot(normal,normalize(vec3(-.35,.55,1.0))),0.0),20.0)*edge;
    color=mix(color,vec3(.93,1.0,.81),sheen*.30);
    color*=1.0-min(.025,edge*.018);
    result=vec4(color,1.0);
  }`
};

export function createFluid(canvas, { compact = false, mobile = false } = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false
  });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  const programs = {};
  const resources = [];
  let targets = [];
  let flow, dye, pressure, divergence, curl, aspect = 1;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);gl.deleteShader(shader);
      throw new Error(message);
    }
    resources.push(['Shader', shader]);return shader;
  }
  const vert = compile(gl.VERTEX_SHADER, vertex);
  for (const [name, source] of Object.entries(shaders)) {
    const program = gl.createProgram();
    resources.push(['Program', program]);
    gl.attachShader(program, vert);gl.attachShader(program, compile(gl.FRAGMENT_SHADER, source));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const uniforms = {};
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = { location: gl.getUniformLocation(program, info.name), type: info.type };
    }
    programs[name] = { program, uniforms };
  }
  const vao = gl.createVertexArray();resources.push(['VertexArray', vao]);gl.bindVertexArray(vao);
  gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);

  function texture(width, height) {
    const tex = gl.createTexture();gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const framebuffer = gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const target = { texture: tex, framebuffer, width, height };targets.push(target);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Unsupported fluid target');
    gl.clearColor(0, 0, 0, 1);gl.clear(gl.COLOR_BUFFER_BIT);
    return target;
  }
  function pair(w, h) {
    return { read: texture(w, h), write: texture(w, h), swap() { [this.read, this.write] = [this.write, this.read]; } };
  }
  function draw(name, target, values = {}) {
    const { program, uniforms } = programs[name];gl.useProgram(program);
    let unit = 0;
    for (const [key, value] of Object.entries(values)) {
      const uniform = uniforms[key];if (!uniform) continue;
      if (uniform.type === gl.SAMPLER_2D) {
        gl.activeTexture(gl.TEXTURE0 + unit);gl.bindTexture(gl.TEXTURE_2D, value.texture);
        gl.uniform1i(uniform.location, unit++);
      } else if (Array.isArray(value)) gl.uniform2f(uniform.location, ...value);
      else gl.uniform1f(uniform.location, value);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer || null);
    gl.viewport(0, 0, target?.width || canvas.width, target?.height || canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function freeTargets() {
    targets.forEach(t => { gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.framebuffer); });targets = [];
  }
  function resize(width, height) {
    aspect = width / height;
    const outputScale = mobile ? Math.min(1, 720 / width, 900 / height) : Math.min(1.5, 1500 / width, 1100 / height);
    const w = Math.max(1, Math.round(width * outputScale));
    const h = Math.max(1, Math.round(height * outputScale));
    if (canvas.width === w && canvas.height === h && flow) return;
    canvas.width = w;canvas.height = h;freeTargets();
    const simSize = compact ? 128 : mobile ? 160 : 224, dyeSize = compact ? 320 : mobile ? 480 : 640;
    const simW = aspect >= 1 ? simSize : Math.round(simSize * aspect);
    const simH = aspect >= 1 ? Math.round(simSize / aspect) : simSize;
    const dyeW = aspect >= 1 ? dyeSize : Math.round(dyeSize * aspect);
    const dyeH = aspect >= 1 ? Math.round(dyeSize / aspect) : dyeSize;
    const minSim = compact ? 24 : 48, minDye = compact ? 48 : 128;
    flow = pair(Math.max(minSim, simW), Math.max(minSim, simH));
    pressure = pair(flow.read.width, flow.read.height);
    divergence = texture(flow.read.width, flow.read.height);curl = texture(flow.read.width, flow.read.height);
    dye = pair(Math.max(minDye, dyeW), Math.max(minDye, dyeH));
    draw('initialize', dye.read);draw('initialize', dye.write);
  }
  function step(dt, strokes) {
    if (!flow || gl.isContextLost()) return;
    const texel = [1 / flow.read.width, 1 / flow.read.height];
    draw('advect', flow.write, { source: flow.read, velocity: flow.read, dt, fade: compact ? 2.0 : 1.15, pigment: 0 });flow.swap();
    strokes.forEach(s => {
      const push = compact ? 14 : 24;
      draw('splat', flow.write, { source: flow.read, point: [s.x, s.y], force: [s.dx * push, s.dy * push], aspect, radius: compact ? .40 : .115, pigment: 0, ink: 0, strength: 1 });flow.swap();
    });
    draw('curl', curl, { source: flow.read, texel });
    draw('confine', flow.write, { source: flow.read, extra: curl, texel, dt });flow.swap();
    draw('divergence', divergence, { source: flow.read, texel });
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.framebuffer);gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 0; i < (compact || mobile ? 10 : 14); i++) {
      draw('pressure', pressure.write, { source: pressure.read, extra: divergence, texel });pressure.swap();
    }
    draw('project', flow.write, { source: flow.read, extra: pressure.read, texel });flow.swap();
    draw('advect', dye.write, { source: dye.read, velocity: flow.read, dt, fade: compact ? .9 : .24, pigment: 1 });dye.swap();
    strokes.forEach(s => {
      const speed = Math.hypot(s.dx * aspect, s.dy);
      if (speed < .0001) return;
      const nx = -s.dy / speed, ny = s.dx * aspect / speed;
      const strength = Math.min(.50, .18 + speed * 8);
      const spread = compact ? .12 : .036;
      // Opposing pigments roll into one another on either side of the cursor's wake.
      for (const side of [-1, 1]) {
        draw('splat', dye.write, { source: dye.read,
          point: [s.x + nx * spread * side / aspect, s.y + ny * spread * side],
          force: [0, 0], aspect, radius: compact ? .34 : .10, pigment: 1, ink: side > 0 ? .96 : .04, strength
        });dye.swap();
      }
    });
  }
  function display() {
    if (dye && !gl.isContextLost()) draw('display', null, { source: dye.read, texel: [1 / dye.read.width, 1 / dye.read.height] });
  }
  function dispose() {
    freeTargets();resources.forEach(([type, item]) => gl[`delete${type}`](item));
  }
  return { resize, step, display, dispose };
}
