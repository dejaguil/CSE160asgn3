// Updated world.js with mixed texture and base color support + camera movement + ground + sky box + world walls

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  varying vec2 v_UV;
  void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

var FSHADER_SOURCE = ` 
  precision mediump float;
  varying vec2 v_UV;
  uniform sampler2D u_Sampler;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_Sampler4;
  uniform sampler2D u_Sampler5;
  uniform sampler2D u_Sampler6;
  uniform int u_TexChoice;
  uniform vec4 u_BaseColor;
  uniform float u_TexColorWeight;
  void main() {
  vec4 texColor;
  if (u_TexChoice == 0) texColor = texture2D(u_Sampler0, v_UV);
  else if (u_TexChoice == 1) texColor = texture2D(u_Sampler1, v_UV);
  else if (u_TexChoice == 2) texColor = texture2D(u_Sampler2, v_UV);
  else if (u_TexChoice == 3) texColor = texture2D(u_Sampler3, v_UV);

  else if (u_TexChoice == 4) texColor = texture2D(u_Sampler4, v_UV);
  else if (u_TexChoice == 5) texColor = texture2D(u_Sampler5, v_UV);
  else if (u_TexChoice == 6) texColor = texture2D(u_Sampler6, v_UV);
  gl_FragColor = mix(u_BaseColor, texColor, u_TexColorWeight);
  }
`;
let canvas, gl;
let a_Position, a_UV, u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler, u_BaseColor, u_TexColorWeight;
let camera, cube, ground, skybox, walls = [];
let isMouseDown = false;
let u_Sampler0, u_Sampler1, u_Sampler2,u_Sampler3, u_Sampler4, u_TexChoice;
let lastX = 0;
let lastY = 0;
const SIZE = 32;

let mobs = [];
const MOB_COUNT = 5;
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  u_BaseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_TexColorWeight = gl.getUniformLocation(gl.program, 'u_TexColorWeight');
u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');
u_TexChoice = gl.getUniformLocation(gl.program, 'u_TexChoice');
u_Sampler5 = gl.getUniformLocation(gl.program, 'u_Sampler5');
u_Sampler6 = gl.getUniformLocation(gl.program, 'u_Sampler6');
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

for (let i = 0; i < MOB_COUNT; i++) {
  const x = Math.floor(Math.random() * (SIZE - 4)) + 2;
  const z = Math.floor(Math.random() * (SIZE - 4)) + 2;

  const isMagma = Math.random() < 0.5;
  const texIndex = isMagma ? 4 : 3; 
  const type = isMagma ? "magma" : "slime";

  const mobBlock = new Cube(texIndex, [x - SIZE / 2, 0, z - SIZE / 2]);
  mobs.push({ cube: mobBlock, x, z, type });
}
  if (!Vector3.prototype.sub) {
    Vector3.prototype.sub = function (v) {
      const e = this.elements;
      const ve = v.elements;
      e[0] -= ve[0]; e[1] -= ve[1]; e[2] -= ve[2];
      return this;
    };
    Vector3.prototype.add = function (v) {
      const e = this.elements;
      const ve = v.elements;
      e[0] += ve[0]; e[1] += ve[1]; e[2] += ve[2];
      return this;
    };
    Vector3.prototype.mul = function (s) {
      const e = this.elements;
      e[0] *= s; e[1] *= s; e[2] *= s;
      return this;
    };
    Vector3.prototype.normalize = function () {
      const e = this.elements;
      const len = Math.hypot(e[0], e[1], e[2]);
      if (len > 0) {
        e[0] /= len; e[1] /= len; e[2] /= len;
      }
      return this;
    };
    Vector3.cross = function (a, b) {
      const ae = a.elements, be = b.elements;
      return new Vector3([
        ae[1] * be[2] - ae[2] * be[1],
        ae[2] * be[0] - ae[0] * be[2],
        ae[0] * be[1] - ae[1] * be[0]
      ]);
    };
  }

  class SimpleCamera {
    constructor(position, target) {
      this.fov = 60;
      this.eye = new Vector3(position);
      this.at = new Vector3(target);
      this.up = new Vector3([0, 1, 0]);
      this.viewMatrix = new Matrix4();
      this.projectionMatrix = new Matrix4();
      this.update();
    }

    update() {
      this.viewMatrix.setLookAt(...this.eye.elements, ...this.at.elements, ...this.up.elements);
      this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
    }

    moveForward(speed = 0.2) {
      let f = new Vector3(this.at.elements);
      f.sub(this.eye).normalize().mul(speed);
      this.eye.add(f);
      this.at.add(f);
    }

    moveBackward(speed = 0.2) {
      let b = new Vector3(this.eye.elements);
      b.sub(this.at).normalize().mul(speed);
      this.eye.add(b);
      this.at.add(b);
    }

    moveLeft(speed = 0.2) {
      let f = new Vector3(this.at.elements);
      f.sub(this.eye).normalize();
      let s = Vector3.cross(this.up, f).normalize().mul(speed);
      this.eye.add(s);
      this.at.add(s);
    }

    moveRight(speed = 0.2) {
      let f = new Vector3(this.at.elements);
      f.sub(this.eye).normalize();
      let s = Vector3.cross(f, this.up).normalize().mul(speed);
      this.eye.add(s);
      this.at.add(s);
    }

    panLeft(angle = 5) {
      let f = new Vector3(this.at.elements);
      f.sub(this.eye);
      let rot = new Matrix4().setRotate(angle, ...this.up.elements);
      let f_prime = rot.multiplyVector3(f);
      this.at = new Vector3([
        this.eye.elements[0] + f_prime.elements[0],
        this.eye.elements[1] + f_prime.elements[1],
        this.eye.elements[2] + f_prime.elements[2]
      ]);

    }

    panRight(angle = 5) {
      this.panLeft(-angle);
    }
    pitch(angle) {
  let forward = new Vector3(this.at.elements);
  forward.sub(this.eye);
  let right = Vector3.cross(forward, this.up).normalize();

  let rot = new Matrix4().setRotate(angle, ...right.elements);
  let f_prime = rot.multiplyVector3(forward);

  this.at = new Vector3([
    this.eye.elements[0] + f_prime.elements[0],
    this.eye.elements[1] + f_prime.elements[1],
    this.eye.elements[2] + f_prime.elements[2]
  ]);
}
  }

  camera = new SimpleCamera([0, 2, 6], [0, 0, 0]);
  cube = new Cube();
  ground = new Cube(1, [0, -0.5, 0], [32, 0.01, 32]);


  skybox = new Cube(0); 
const map = [];

for (let x = 0; x < SIZE; x++) {
  map[x] = [];
  for (let z = 0; z < SIZE; z++) {
    map[x][z] = 0;
  }
}

const GATE_WIDTH = 3;
const GATE_START = Math.floor(SIZE / 2) - Math.floor(GATE_WIDTH / 2);
const GATE_END = GATE_START + GATE_WIDTH;

for (let x = 0; x < SIZE; x++) {
  for (let z = 0; z < SIZE; z++) {
    let isEdge = x === 0 || x === SIZE - 1 || z === 0 || z === SIZE - 1;
    let isGateOpening = (z === 0 && x >= GATE_START && x < GATE_END);

    if (isEdge && !isGateOpening) {
      let height = Math.floor(Math.random() * 4) + 1; // height: 1–4
      for (let y = 0; y < height; y++) {
        let wallBlock = new Cube(2, [x - SIZE / 2, y, z - SIZE / 2]);
        walls.push(wallBlock);
        map[x][z] = height; // optional, keep map accurate
      }
    }
  }
}r (let i = 0; i < 5; i++) {
  const x = Math.floor(Math.random() * 10) + 5;
  const z = Math.floor(Math.random() * 10) + 5;

  // Tree trunk (brown texture index 5)
  let trunk = new Cube(5, [x - SIZE/2, 0, z - SIZE/2], [0.25, 1, 0.25]);
  walls.push(trunk);

  // Tree top (green texture index 6)
  let leaves = new Cube(6, [x - SIZE/2, 1, z - SIZE/2], [1, 1, 1]);
  walls.push(leaves);
}

canvas.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
  isMouseDown = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  const sensitivity = 0.3;

  camera.panLeft(-dx * sensitivity);
  camera.pitch(-dy * sensitivity);
  camera.update();
});
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const forward = new Vector3(camera.at.elements).sub(camera.eye).normalize();
  const target = new Vector3(camera.eye.elements).add(forward.mul(1));
  const tx = Math.floor(target.elements[0] + SIZE / 2);
  const tz = Math.floor(target.elements[2] + SIZE / 2);

  switch (key) {
    case 'w': camera.moveForward(); break;
    case 's': camera.moveBackward(); break;
    case 'a': camera.moveLeft(); break;
    case 'd': camera.moveRight(); break;
    case 'q': camera.panLeft(); break;
    case 'e': camera.panRight(); break;

 
    case 'f': {
      if (tx >= 0 && tx < SIZE && tz >= 0 && tz < SIZE) {
        const height = map[tx]?.[tz] ?? 0;
        map[tx][tz] = height + 1;

        const newBlock = new Cube(2, [tx - SIZE / 2, height, tz - SIZE / 2]);
        walls.push(newBlock);
      }
      break;
    }

 
    case 'g': {
      if (tx >= 0 && tx < SIZE && tz >= 0 && tz < SIZE) {
        const height = map[tx]?.[tz] ?? 0;
        if (height > 0) {
          map[tx][tz] = height - 1;

       
          for (let i = walls.length - 1; i >= 0; i--) {
            const wall = walls[i];
            const wx = wall.position[0] + SIZE / 2;
            const wy = wall.position[1];
            const wz = wall.position[2] + SIZE / 2;

            if (Math.floor(wx) === tx && Math.floor(wz) === tz && wy === height - 1) {
              walls.splice(i, 1);
              break;
            }
          }
        }
      }
      break;
    }
  }

  camera.update();
});

initTextures(gl, () => requestAnimationFrame(tick));

}

function tick() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  camera.update();
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projectionMatrix.elements);
  gl.uniform4f(u_BaseColor, 0.0, 0.5, 1.0, 1.0);
  gl.uniform1f(u_TexColorWeight, 1.0);
  skybox.position = [...camera.eye.elements];
  skybox.scale = [1000, 1000, 1000];
  skybox.render();
  ground.render();
  cube.render();
  for (let m of mobs) {
  m.cube.render();
}
  for (let w of walls) w.render();
  requestAnimationFrame(tick);
}




class Cube {
  constructor(texChoice = 0, position = [0, 0, 0], scale = [1, 1, 1]) {
    this.texChoice = texChoice;
    this.position = position;
    this.scale = scale;
    this.modelMatrix = new Matrix4();
    this.initBuffers();
  }

  initBuffers() {
    const s = 0.5;
    const vertices = new Float32Array([
      -s,-s, s,   s,-s, s,   s, s, s,
      -s,-s, s,   s, s, s,  -s, s, s,
      -s,-s,-s,  -s, s,-s,   s, s,-s,
      -s,-s,-s,   s, s,-s,   s,-s,-s,
      -s, s,-s,  -s, s, s,   s, s, s,
      -s, s,-s,   s, s, s,   s, s,-s,
      -s,-s,-s,   s,-s,-s,   s,-s, s,
      -s,-s,-s,   s,-s, s,  -s,-s, s,
       s,-s,-s,   s, s,-s,   s, s, s,
       s,-s,-s,   s, s, s,   s,-s, s,
      -s,-s,-s,  -s,-s, s,  -s, s, s,
      -s,-s,-s,  -s, s, s,  -s, s,-s
    ]);

    const uvs = new Float32Array([
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
      0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
      0,1, 0,0, 1,0,  0,1, 1,0, 1,1,
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
      0,0, 1,0, 1,1,  0,0, 1,1, 0,1
    ]);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    this.n = 36;
  }
  updateMatrix() {
    this.modelMatrix.setIdentity();
    this.modelMatrix.translate(...this.position);
    this.modelMatrix.scale(...this.scale);
  }
  render() {
    this.updateMatrix();
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);
    gl.uniform4f(u_BaseColor, 0.0, 0.5, 1.0, 1.0);
    gl.uniform1f(u_TexColorWeight, 1.0);
    gl.uniform1i(u_TexChoice, this.texChoice);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, this.n);
  }
}
function getBlockInFront() {
  const forward = new Vector3(camera.at.elements).sub(camera.eye).normalize();
  const target = new Vector3(camera.eye.elements).add(forward.mul(1));

  const x = Math.floor(target.elements[0] + SIZE / 2);
  const z = Math.floor(target.elements[2] + SIZE / 2);

  return { x, z };
}
function initTextures(gl, callback) {
  let loaded = 0;
  const images = ['sky8.jpg', 'grass1.jpg', 'brick.jpg', 'slime.jpg', 'magma.jpg', 'trunk.jpg', 'leaves.jpg'];
  const textures = [];

for (let i = 0; i < images.length; i++) {
  textures[i] = gl.createTexture();
  const image = new Image();
  image.onload = () => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(gl.program, 'u_Sampler' + i), i);

    if (++loaded === images.length) callback(); 
  };
  image.src = images[i];
}
}

main();
setInterval(() => {
  for (let m of mobs) {
    const dx = Math.floor(Math.random() * 3) - 1;
    const dz = Math.floor(Math.random() * 3) - 1;
    const newX = m.x + dx;
    const newZ = m.z + dz;

    if (newX > 0 && newX < SIZE - 1 && newZ > 0 && newZ < SIZE - 1) {
      const isGate = (newZ === 0 && newX >= GATE_START && newX < GATE_END);
      if (isGate) {
        alert(`💥 A ${m.type} escaped! You lose.`);
        location.reload();
        return;
      }

      m.x = newX;
      m.z = newZ;
      m.cube.position = [newX - SIZE / 2, 0, newZ - SIZE / 2];
    }
  }
}, 2000);
