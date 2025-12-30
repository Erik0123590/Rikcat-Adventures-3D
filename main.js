// main.js — Rikcat Adventures 3D (light, mobile-optimized)
(() => {
  // three.js globals
  const THREE = window.THREE;
  if (!THREE) { alert('Three.js não carregado. Verifique a conexão.'); return; }

  // Renderer
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xBEEAF7);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 6, 10);

  // Light
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 3);
  scene.add(dir);
  const amb = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(amb);

  // Simple ground and platforms
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x7bd06b, roughness: 0.9, metalness:0 });
  function createPlatform(x, y, z, sx=4, sy=0.5, sz=4) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(geo, platformMaterial);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.userData.collider = { type:'box', halfSize: new THREE.Vector3(sx/2, sy/2, sz/2) };
    scene.add(m);
    platforms.push(m);
    return m;
  }

  const platforms = [];
  createPlatform(0, -1.5, 0, 20, 1, 20); // ground
  createPlatform(0, 0.5, -8, 6, 0.6, 3);
  createPlatform(6, 1.8, -4, 4, 0.6, 4);
  createPlatform(-6, 2.6, -2, 3, 0.6, 3);

  // Simple skybox-ish far geometry
  const farGeo = new THREE.PlaneGeometry(200, 200);
  const farMat = new THREE.MeshBasicMaterial({ color: 0x9eeaf0 });
  const far = new THREE.Mesh(farGeo, farMat);
  far.rotation.x = -Math.PI/2;
  far.position.y = -50;
  scene.add(far);

  // Rikcat character (low-poly friendly)
  const rikcat = new THREE.Group();
  // body
  const bodyGeo = new THREE.SphereGeometry(0.9, 16, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFB000, roughness:0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = false;
  body.position.y = 1;
  rikcat.add(body);

  // ears (simple cones)
  const earGeo = new THREE.ConeGeometry(0.25, 0.5, 8);
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xFF8FA0, roughness:0.9 });
  const earL = new THREE.Mesh(earGeo, bodyMat);
  earL.position.set(-0.45, 1.6, 0.15);
  earL.rotation.z = -0.3;
  earL.scale.set(1,1,1);
  rikcat.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.45;
  earR.rotation.z = 0.3;
  rikcat.add(earR);

  // simple face (eye planes)
  const eyeGeo = new THREE.PlaneGeometry(0.15, 0.3);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x221111, transparent:true });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.22, 1.1, 0.82);
  eyeL.rotation.y = 0;
  rikcat.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.22; rikcat.add(eyeR);

  // nick label (simple DOM overlay instead of 3D text)

  rikcat.position.set(0, 0, 0);
  scene.add(rikcat);

  // Physics state
  const state = {
    pos: new THREE.Vector3(0, 1, 0),
    vel: new THREE.Vector3(0, 0, 0),
    onGround: false,
    moveDir: 0, // -1 left, 0 idle, 1 right
    canJump: true,
  };

  // Simple collider for rikcat (capsule approximated by a box + radius)
  const playerRadius = 0.6;
  const playerHeight = 1.6;

  // Controls (keyboard + touch)
  const controls = {
    left: false, right:false, jump:false, attack:false
  };

  function bindButtons() {
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const jumpBtn = document.getElementById('jump-btn');
    const attackBtn = document.getElementById('attack-btn');
    const emotes = document.querySelectorAll('.emote');

    function addTouch(btn, down, up){
      btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); down(); }, {passive:false});
      btn.addEventListener('mousedown', (e)=>{ e.preventDefault(); down(); });
      btn.addEventListener('touchend', (e)=>{ e.preventDefault(); up(); }, {passive:false});
      btn.addEventListener('mouseup', (e)=>{ e.preventDefault(); up(); });
      btn.addEventListener('mouseleave', up);
    }

    addTouch(leftBtn, ()=>controls.left = true, ()=>controls.left = false);
    addTouch(rightBtn, ()=>controls.right = true, ()=>controls.right = false);
    addTouch(jumpBtn, ()=>controls.jump = true, ()=>controls.jump = false);
    addTouch(attackBtn, ()=>{ controls.attack = true; setTimeout(()=>controls.attack=false,120); }, ()=>{});

    emotes.forEach(b=> b.addEventListener('click', ()=> playEmote(b.dataset.emote)));

    // keyboard support for testing in desktop
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'ArrowLeft' || e.key === 'a') controls.left = true;
      if (e.code === 'ArrowRight' || e.key === 'd') controls.right = true;
      if (e.code === 'Space') controls.jump = true;
      if (e.key === 'f') controls.attack = true;
    });
    window.addEventListener('keyup', (e)=>{
      if (e.code === 'ArrowLeft' || e.key === 'a') controls.left = false;
      if (e.code === 'ArrowRight' || e.key === 'd') controls.right = false;
      if (e.code === 'Space') controls.jump = false;
      if (e.key === 'f') controls.attack = false;
    });
  }

  bindButtons();

  // Emote animation (scale pop)
  function playEmote(name){
    // small visual feedback via scale
    const t0 = performance.now();
    const duration = 600;
    const startScale = rikcat.scale.clone();
    const upScale = startScale.clone().multiplyScalar(1.14);
    const loop = (now)=>{
      const p = Math.min(1,(now - t0)/duration);
      const s = (1 - p)*1 + p*0.9;
      rikcat.scale.setScalar(1 + Math.sin(p*Math.PI)*0.18);
      if (p < 1) requestAnimationFrame(loop);
      else rikcat.scale.setScalar(1);
    };
    requestAnimationFrame(loop);
  }

  // Simple AABB collision helper for box vs point approximation
  function checkPlatformCollision(pos) {
    // returns y of surface if colliding, else null
    for (const p of platforms) {
      const hs = p.userData.collider.halfSize;
      const min = new THREE.Vector3().copy(p.position).sub(hs);
      const max = new THREE.Vector3().copy(p.position).add(hs);
      // horizontal check
      if (pos.x > min.x - playerRadius && pos.x < max.x + playerRadius && pos.z > min.z - playerRadius && pos.z < max.z + playerRadius) {
        // if player bottom below top surface && above bottom
        const topY = max.y;
        if (pos.y - playerHeight/2 <= topY + 0.05 && pos.y - playerHeight/2 >= topY - 1.2) {
          return topY + playerHeight/2; // snap player so bottom sits on top
        }
      }
    }
    return null;
  }

  // Camera follow
  const camTarget = new THREE.Object3D();
  scene.add(camTarget);

  // Main loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;

    // input -> desired move
    let move = 0;
    if (controls.left) move -= 1;
    if (controls.right) move += 1;

    // accelerate
    const maxSpeed = 5.0;
    const accel = 18.0;
    state.vel.x += (move * maxSpeed - state.vel.x) * Math.min(1, accel * dt);

    // gravity
    state.vel.y += -9.8 * (dt * 1);

    // jump
    if (controls.jump && state.onGround && state.canJump) {
      state.vel.y = 6.8; // jump impulse
      state.onGround = false;
      state.canJump = false;
      setTimeout(()=> state.canJump = true, 250); // jump cooldown
      // small jump animation
      rikcat.position.y += 0.02;
    }

    // apply velocity
    state.pos.x += state.vel.x * dt;
    state.pos.y += state.vel.y * dt;
    state.pos.z += 0 * dt; // no z movement for this simple lane

    // collision
    const groundY = checkPlatformCollision(state.pos);
    if (groundY !== null) {
      state.onGround = true;
      state.vel.y = Math.max(0, state.vel.y);
      state.pos.y = groundY;
    } else {
      state.onGround = false;
    }

    // simple damping
    if (state.onGround) state.vel.x *= 0.9;
    else state.vel.x *= 0.995;

    // update rikcat transform
    // bob / idle
    const t = now * 0.002;
    const bob = Math.sin(t * 6) * 0.02;
    rikcat.position.set(state.pos.x, state.pos.y + bob, state.pos.z);

    // squash and stretch on vertical velocity
    const v = state.vel.y;
    const stretch = 1 + Math.max(-0.08, Math.min(0.18, -v * 0.02));
    rikcat.scale.set(1/stretch, stretch, 1/stretch);

    // simple ear follow
    earL.rotation.x = -0.15 + Math.sin(t*4) * 0.05;
    earR.rotation.x = -0.15 + Math.cos(t*4) * 0.05;

    // camera follow with lerp and lookahead
    const lookAhead = Math.max(-2, Math.min(2, state.vel.x * 0.5));
    const targetPos = new THREE.Vector3(state.pos.x + lookAhead, state.pos.y + 3.2, state.pos.z + 8);
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(new THREE.Vector3(state.pos.x, state.pos.y + 1.2, state.pos.z));

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // Resize handling
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  // Start
  requestAnimationFrame((now)=>{ last = now; requestAnimationFrame(frame); });

  // Simple start overlay
  const overlay = document.getElementById('overlay-message');
  overlay.classList.remove('hidden');
  function startGame(){ overlay.classList.add('hidden'); }
  canvas.addEventListener('touchstart', startGame, {once:true});
  canvas.addEventListener('mousedown', startGame, {once:true});

  // Optional: show FPS / debug in console
  console.log('Rikcat Adventures 3D — demo initialized (mobile-optimized).');

})();
