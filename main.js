const canvas = document.getElementById('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcceeee);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Luz
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

// Chão
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(50, 1, 50),
  new THREE.MeshStandardMaterial({ color: 0x4c8b3c })
);
ground.position.y = -0.5;
scene.add(ground);

// Rikcat (laranja)
const rikcat = new THREE.Group();

const body = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff9933 })
);
rikcat.add(body);

// Orelhas
function ear(x) {
  const e = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.6, 3),
    new THREE.MeshStandardMaterial({ color: 0xff9933 })
  );
  e.position.set(x, 1.1, 0);
  e.rotation.z = Math.PI;
  return e;
}
rikcat.add(ear(-0.6));
rikcat.add(ear(0.6));

scene.add(rikcat);

const state = {
  x: 0,
  z: 0,
  rot: 0
};

const speed = 0.08;

const input = { forward: false, back: false, left: false, right: false };

// Botões D‑Pad
document.querySelectorAll('#dpad button').forEach(btn => {
  const dir = btn.dataset.dir;
  btn.addEventListener('touchstart', e => { e.preventDefault(); input[dir] = true; });
  btn.addEventListener('touchend', () => input[dir] = false);
});

function animate() {
  requestAnimationFrame(animate);

  if (input.left) state.rot += 0.05;
  if (input.right) state.rot -= 0.05;

  const dx = Math.sin(state.rot);
  const dz = Math.cos(state.rot);

  if (input.forward) {
    state.x += dx * speed;
    state.z += dz * speed;
  }
  if (input.back) {
    state.x -= dx * speed;
    state.z -= dz * speed;
  }

  rikcat.position.set(state.x, 1, state.z);
  rikcat.rotation.y = state.rot;

  // CÂMERA ESTILO ROBLOX
  const camX = state.x - dx * 6;
  const camZ = state.z - dz * 6;

  camera.position.lerp(new THREE.Vector3(camX, 4, camZ), 0.1);
  camera.lookAt(rikcat.position);

  renderer.render(scene, camera);
}

animate();
