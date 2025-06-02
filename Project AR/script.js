// === Imports ===
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as CANNON from 'cannon-es';
import * as lil from 'lil-gui';

// === AR Setup ===
const arScene = document.querySelector('a-scene');
const mainScene = document.querySelector('#main-scene');
const toggleARButton = document.getElementById('toggle-ar');
let isARMode = false;

// Function to export scene to GLB
function exportSceneToGLB() {
    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        const options = {
            binary: true,
            includeCustomExtensions: true,
            animations: true
        };

        exporter.parse(scene, (gltf) => {
            const blob = new Blob([gltf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            resolve(url);
        }, options, (error) => {
            reject(error);
        });
    });
}

// Handle AR toggle
toggleARButton.addEventListener('click', async () => {
    if (!isARMode) {
        try {
            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            // Switch to AR mode
            arScene.style.display = 'block';
            canvas.style.display = 'none';
            isARMode = true;
            toggleARButton.textContent = 'Exit AR';
            toggleARButton.classList.add('active');
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Please allow camera access to use AR features');
        }
    } else {
        // Switch back to Three.js mode
        arScene.style.display = 'none';
        canvas.style.display = 'block';
        isARMode = false;
        toggleARButton.textContent = 'AR Mode';
        toggleARButton.classList.remove('active');
    }
});

// Handle marker found/lost events
arScene.addEventListener('markerFound', () => {
    console.log('Marker found!');
    if (mainScene) {
        mainScene.setAttribute('visible', true);
        // Start all animations
        const animatedEntities = mainScene.querySelectorAll('[animation-mixer]');
        animatedEntities.forEach(entity => {
            const mixer = entity.components['animation-mixer'];
            if (mixer && mixer.mixer) {
                mixer.mixer.play();
            }
        });
    }
});

arScene.addEventListener('markerLost', () => {
    console.log('Marker lost!');
    if (mainScene) {
        mainScene.setAttribute('visible', false);
        // Stop all animations
        const animatedEntities = mainScene.querySelectorAll('[animation-mixer]');
        animatedEntities.forEach(entity => {
            const mixer = entity.components['animation-mixer'];
            if (mixer && mixer.mixer) {
                mixer.mixer.stop();
            }
        });
    }
});

// === Scene Setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color('#ffffff');

// === Physics World ===
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});
const timeStep = 1/60;

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape,
  position: new CANNON.Vec3(0, -0.1, 0)
});
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
floorBody.position.set(-1.15, 0.4, 0.8); // Raise Y from 0.3 to 0.32 (or higher if needed)
world.addBody(floorBody);

// === Canvas & Renderer ===
const canvas = document.querySelector('.webgl');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.dithering = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// === Camera & Controls ===
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);
Object.assign(controls, {
  minPolarAngle: Math.PI / 3,
  maxPolarAngle: Math.PI / 2,
  minAzimuthAngle: -Math.PI / 4,
  maxAzimuthAngle: Math.PI / 4,
  minDistance: 3,
  maxDistance: 6
});

// === Resize Handler ===
window.addEventListener('resize', () => {
    if (!isARMode) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// === Lighting ===
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.radius = 4;
Object.assign(dirLight.shadow.mapSize, { x: 1024, y: 1024 });
Object.assign(dirLight.shadow.camera, {
  top: 10, bottom: -10, left: -10, right: 10
});
scene.add(dirLight);

// === Spotlights ===
const spotlightConfigs = [
  [-4, 5, -4], [4, 5, -4], [-4, 5, 4], [4, 5, 4]
];
const spotlights = spotlightConfigs.map((pos) => {
  const light = new THREE.SpotLight(0xffffff, 1.2, 15, Math.PI / 6, 0.3, 1.5);
  light.position.set(...pos);
  light.target.position.set(0, 1, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0001;
  scene.add(light, light.target);
  return light;
});

// === Environment CubeMap ===
const cubeTextureLoader = new THREE.CubeTextureLoader();
const cubeMap = cubeTextureLoader.load([
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581123/Project%20Virtual%20Design%20and%20Animation/px_ekmsbv.webp', // right
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581122/Project%20Virtual%20Design%20and%20Animation/nx_gfjjbd.webp', // left
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581122/Project%20Virtual%20Design%20and%20Animation/py_zuw39w.webp', // top
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581122/Project%20Virtual%20Design%20and%20Animation/ny_dy9djm.webp', // bottom
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581123/Project%20Virtual%20Design%20and%20Animation/pz_iktdkb.webp', // front
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581122/Project%20Virtual%20Design%20and%20Animation/nz_pwjcmu.webp'  // back
]);
// scene.background = cubeMap;
scene.environment = cubeMap;

// === Audio ===
let marbleSound;
const audioLoader = new THREE.AudioLoader();

// Load sound
audioLoader.load('https://res.cloudinary.com/diu6hubef/video/upload/v1748581401/Project%20Virtual%20Design%20and%20Animation/sound_r7obpg.mp3', (buffer) => {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  marbleSound = new THREE.PositionalAudio(listener);
  marbleSound.setBuffer(buffer);
  marbleSound.setRefDistance(1);
  marbleSound.setVolume(0.5);
});

// === Loaders & Globals ===
const gltfLoader = new GLTFLoader();

// === Glass Cup ===
gltfLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581260/Project%20Virtual%20Design%20and%20Animation/transparent_cup_with_image_izmhx9.glb', (gltf) => {
  const model = gltf.scene;
  model.scale.set(0.1, 0.1, 0.1);
  model.position.set(-1.15, 0.36, 0.8);

  let cupAdded = false;

  model.traverse((child) => {
    if (child.isMesh && !cupAdded) {
      const mat = child.material;
      mat.envMap = cubeMap; // Using our existing cubeMap
      mat.transparent = true;
      mat.opacity = 0.5;
      mat.metalness = 0;
      mat.roughness = 0;
      mat.transmission = 1.0;
      mat.ior = 1.45;
      mat.thickness = 1.0;
      mat.needsUpdate = true;


      // Physics setup
      const scaleFactor = 0.1; // Match mesh scale!
      const geometry = child.geometry;
      geometry.computeVertexNormals();
      const position = geometry.attributes.position.array;
      const index = geometry.index?.array;

      const vertices = [];
      for (let i = 0; i < position.length; i += 3) {
        vertices.push(
          position[i] * scaleFactor,
          position[i + 1] * scaleFactor,
          position[i + 2] * scaleFactor
        );
      }

      const indices = index || Array.from({length: vertices.length/3}, (_, i) => i);

      const shape = new CANNON.Trimesh(vertices, indices);
      const body = new CANNON.Body({
        mass: 0,
        shape,
        position: new CANNON.Vec3(-1.15, 0.36, 0.8), // Match mesh position!
        quaternion: new CANNON.Quaternion(...child.quaternion.toArray())
      });
      world.addBody(body);
      cupAdded = true;
    }
  });

  scene.add(model);
});

// Cup dimensions (match your mesh)
const cupRadius = 0.045; // Adjust to match your cup's inner radius
const cupHeight = 1;  // Adjust to match your cup's height
const cupThickness = 0.005; // Wall thickness

// Cup position (match your mesh)
const cupX = -1.15;
const cupY = 0.36;
const cupZ = 0.8;

// Cup body
const cupBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(cupX, cupY, cupZ) });

// Bottom
const bottomShape = new CANNON.Cylinder(cupRadius, cupRadius, cupThickness, 16);
const bottomQuat = new CANNON.Quaternion();
bottomQuat.setFromEuler(-Math.PI/2, 0, 0);
cupBody.addShape(bottomShape, new CANNON.Vec3(0, -cupHeight/2, 0), bottomQuat);

// Side walls (approximate with 4 thin boxes)
const wallHeight = cupHeight;
const wallLength = cupRadius * 2;
const wallShape = new CANNON.Box(new CANNON.Vec3(cupThickness/2, wallHeight/2, wallLength/2));
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI/2;
  const x = Math.cos(angle) * (cupRadius - cupThickness/2);
  const z = Math.sin(angle) * (cupRadius - cupThickness/2);
  const quat = new CANNON.Quaternion();
  quat.setFromEuler(0, angle, 0);
  cupBody.addShape(wallShape, new CANNON.Vec3(x, 0, z), quat);
}

world.addBody(cupBody);

// === Marbles ===
const marbles = [];

function spawnMarble() {
  if (marbleSound) {
    marbleSound.play();
  } else {
    // Fallback to HTML5 Audio if Three.js audio isn't loaded yet
    const fallbackAudio = document.getElementById('marbleSound');
    if (fallbackAudio) {
      fallbackAudio.currentTime = 0; // Rewind to start
      fallbackAudio.play();
    }
  }

  const radius = 0.015;
  const spread = 0.045; // Smaller spread to keep marbles inside the cup
  const body = new CANNON.Body({
    mass: 0.05,
    shape: new CANNON.Sphere(radius),
    position: new CANNON.Vec3(
      -1.15 + (Math.random() - 0.5) * spread, // X: near cup center
      3,                                   // Y: just above cup rim (adjust as needed)
      0.8 + (Math.random() - 0.5) * spread    // Z: near cup center
    ),
    material: new CANNON.Material({
      restitution: 0.7 // More bouncy
    })
  });

  // Add floor collision
  body.addEventListener('collide', (e) => {
    if (e.body === floorBody) {
      // Remove marble after 5 seconds of hitting the floor
      setTimeout(() => {
        const index = marbles.findIndex(m => m.body === body);
        if (index !== -1) {
          world.removeBody(body);
          scene.remove(marbles[index].mesh);
          marbles.splice(index, 1);
        }
      }, 2000);
    }
  });

  world.addBody(body);

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(Math.random(), Math.random(), Math.random()),
    transmission: 1,
    roughness: 0,
    thickness: 0.1,
    envMap: cubeMap,
    transparent: true
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    material
  );
  mesh.castShadow = true;
  scene.add(mesh);

  marbles.push({ mesh, body });
}

// === TV Screen ===
const video = document.createElement('video');
video.src = 'https://res.cloudinary.com/diu6hubef/video/upload/v1748581401/Project%20Virtual%20Design%20and%20Animation/video_mjepie.mp4';
video.loop = true;
video.muted = true;
video.autoplay = true;
video.crossOrigin = 'anonymous';
video.playsInline = true;

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat;

const tvGeometry = new THREE.PlaneGeometry(4, 2.25);
const tvMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
const tvMesh = new THREE.Mesh(tvGeometry, tvMaterial);
tvMesh.position.set(0, 2, -2.599);
scene.add(tvMesh);

const frameGeometry = new THREE.BoxGeometry(4.1, 2.35, 0.1);
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
frameMesh.position.set(0, 2, -2.65);
scene.add(frameMesh);

video.addEventListener('canplay', () => video.play());


const decorativeModels = [];
const mixers = [];
let loadedModels = 0;
const modelPaths = [
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581257/Project%20Virtual%20Design%20and%20Animation/table_k0dlbn.glb',
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581255/Project%20Virtual%20Design%20and%20Animation/big_speaker_cjw4bp.glb',
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581255/Project%20Virtual%20Design%20and%20Animation/door_hxps7k.glb',
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581257/Project%20Virtual%20Design%20and%20Animation/chair_b6esyd.glb'
];
const modelTransforms = {
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581257/Project%20Virtual%20Design%20and%20Animation/table_k0dlbn.glb': {
    position: [-1.1, 0, 1.1],
    rotation: [0, 0.9, 0],
    scale: [1, 1, 1]
  },
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581255/Project%20Virtual%20Design%20and%20Animation/big_speaker_cjw4bp.glb': {
    position: [1, 0, -0.6],
    rotation: [0, -2.2, 0],
    scale: [0.2, 0.2, 0.2]
  },
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581255/Project%20Virtual%20Design%20and%20Animation/door_hxps7k.glb': {
    position: [1.7, 0, 0.4],
    rotation: [0, -1.7, 0],
    scale: [0.17, 0.17, 0.17]
  },
  'https://res.cloudinary.com/diu6hubef/image/upload/v1748581257/Project%20Virtual%20Design%20and%20Animation/chair_b6esyd.glb': {
    position: [-1.2, 0, -0.4],
    rotation: [0, 1, 0],
    scale: [1.31, 1.31, 1.31]
  }
};


// === Texture loader Loader ===
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

const tableColorTextsure = textureLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581383/Project%20Virtual%20Design%20and%20Animation/table_col_qyxezi.jpg');
const tableRoughnessTexture = textureLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581384/Project%20Virtual%20Design%20and%20Animation/table_rou_ejxnka.jpg');

const skidNorTextsure = textureLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581388/Project%20Virtual%20Design%20and%20Animation/anti_skid_tiles_nor_gl_4k_isk6xd.jpg');
const skidArmTexture = textureLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581389/Project%20Virtual%20Design%20and%20Animation/anti_skid_tiles_arm_4k_d4nbqt.jpg');
const skidColorTexture = textureLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581391/Project%20Virtual%20Design%20and%20Animation/anti_skid_tiles_diff_4k_ks18gy.jpg');




// === Model Loader ===
function loadModel(path, index) {
  gltfLoader.load(path, (gltf) => {
    const model = gltf.scene;
    model.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        // Assign textures based on model path
        if (path.includes('table')) {
          obj.material.map = tableColorTextsure;
          obj.material.roughnessMap = tableRoughnessTexture;
          if (obj.material.map) {
            obj.material.map.wrapS = obj.material.map.wrapT = THREE.ClampToEdgeWrapping;
            obj.material.map.repeat.set(0, 0);
            obj.material.map.offset.set(0, 0);
          }
          if (obj.material.roughnessMap) {
            obj.material.roughnessMap.wrapS = obj.material.roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
            obj.material.roughnessMap.repeat.set(0, 0);
            obj.material.roughnessMap.offset.set(0, 0);
          }
        } else if (path.includes('big_speaker')) {
          // Example: assign a different texture for the speaker
          if (obj.material.map) {
            obj.material.map.wrapS = obj.material.map.wrapT = THREE.ClampToEdgeWrapping;
            obj.material.map.repeat.set(1, 1);
            obj.material.map.offset.set(0, 0);
          }
          if (obj.material.roughnessMap) {
            obj.material.roughnessMap.wrapS = obj.material.roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
            obj.material.roughnessMap.repeat.set(1, 1);
            obj.material.roughnessMap.offset.set(0, 0);
          }
        }
        obj.material.needsUpdate = true;
      }
    });

    const transform = modelTransforms[path];
    if (transform) {
      model.position.set(...transform.position);
      model.rotation.set(...transform.rotation);
      model.scale.set(...transform.scale);
    } else {
      const angle = (index / modelPaths.length) * Math.PI * 2;
      const radius = 4;
      model.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    }

    scene.add(model);
    decorativeModels.push(model);

    const mixer = new THREE.AnimationMixer(model);
    if (gltf.animations.length) {
      const action = mixer.clipAction(gltf.animations[0]);
      model.userData = { mixer, action, played: false };
      mixers.push(mixer);
    }

    createModelGUI(model, index);
    if (++loadedModels === modelPaths.length) setupModelsGUI();
  });
}
modelPaths.forEach(loadModel);

// Sushi Animation
let sushiMixer;
let sushiActions = [];

gltfLoader.load(
  'https://res.cloudinary.com/duqchsilk/image/upload/v1748850381/Wheelchair_animation_lgajiu.glb',
  (gltf) => {
    const sushi = gltf.scene;
    sushi.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material.metalness = 0.3;
        child.material.roughness = 0.5;
      }
    });
    scene.add(sushi);
    sushi.position.set(-1.1, 0.35, 1.1);
    sushi.scale.set(0.5, 0.5, 0.5);
    sushi.rotation.y = -3.1;

    sushiMixer = new THREE.AnimationMixer(sushi);
    sushiActions = gltf.animations.map((clip) => {
      const action = sushiMixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      return action;
    });

    const sushiFolder = gui.addFolder('Sushi');
    sushiFolder.add(sushi.position, 'x', -5, 5, 0.1).name('Pos X');
    sushiFolder.add(sushi.position, 'y', 0, 5, 0.1).name('Pos Y');
    sushiFolder.add(sushi.position, 'z', -5, 5, 0.1).name('Pos Z');
    sushiFolder.add(sushi.rotation, 'y', -Math.PI, Math.PI, 0.1).name('Rotation Y');
    sushiFolder.add(sushi.scale, 'x', 0, 1, 0.01).name('Scale X');
    sushiFolder.add(sushi.scale, 'y', 0, 1, 0.01).name('Scale Y');
    sushiFolder.add(sushi.scale, 'z', 0, 1, 0.01).name('Scale Z');
    sushiFolder.open();
  }
);

document.querySelector('.serve-btn').addEventListener('click', () => {
  if(sushiActions.length > 0) {
    sushiActions.forEach(action => {
      action.reset();
      action.play();
    });
  }
});

document.querySelector('.marbles-btn').addEventListener('click', spawnMarble);


// === GUI ===
const gui = new lil.GUI();
gui.close()

function createModelGUI(model, index) {
  const folder = gui.addFolder(`Model ${index + 1}`);
  folder.add(model.position, 'x', -10, 10, 0.1).name('Pos X');
  folder.add(model.position, 'y', 0, 5, 0.1).name('Pos Y');
  folder.add(model.position, 'z', -10, 10, 0.1).name('Pos Z');

  // Uniform Scale Controller
  const scale = { s: model.scale.x };
  folder.add(scale, 's', -5, 5, 0.01).name('Scale').onChange((val) => {
    model.scale.set(val, val, val);
  });

  folder.add(model.rotation, 'y', -Math.PI, Math.PI, 0.1).name('Rotation Y');
  folder.open();
}

function setupModelsGUI() {
  // Placeholder if needed later
}

spotlights.forEach((spot, i) => {
  const folder = gui.addFolder(`Spotlight ${i + 1}`);
  folder.add(spot.position, 'x', -10, 10, 0.1).name('Pos X');
  folder.add(spot.position, 'y', 0, 10, 0.1).name('Pos Y');
  folder.add(spot.position, 'z', -10, 10, 0.1).name('Pos Z');
  folder.add(spot, 'intensity', 0, 5, 0.1).name('Intensity');
  folder.add(spot, 'angle', 0.1, Math.PI / 2, 0.1).name('Angle');
  folder.open();
});

// === Stage ===
const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(2, 2, 0.3, 64),
  new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.4, roughness: 0.8 })
);
stage.receiveShadow = true;
stage.position.y = -0.15;
stage.material.map = skidColorTexture;
stage.material.normalMap = skidNorTextsure; // Use the normal map texture here
stage.material.roughnessMap = skidArmTexture; // Optional: add roughness map if desired
stage.material.needsUpdate = true;
scene.add(stage);

const stageFolder = gui.addFolder('Stage');
stageFolder.add(stage.position, 'y', 0, 1, 0.1).name('Height');
stageFolder.addColor({ color: '#333333' }, 'color').name('Color').onChange(val => stage.material.color.set(val));
stageFolder.open();

// === Character ===
let characterMixer;

gltfLoader.load('https://res.cloudinary.com/diu6hubef/image/upload/v1748581267/Project%20Virtual%20Design%20and%20Animation/guy_animated_xxnk1k.glb', (gltf) => {
  const character = gltf.scene;
  character.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  character.position.set(0, 0, 0);
  character.scale.set(1, 1, 1);
  scene.add(character);

  characterMixer = new THREE.AnimationMixer(character);
  if (gltf.animations.length) characterMixer.clipAction(gltf.animations[0]).play();

  const charFolder = gui.addFolder('Character');
  charFolder.add(character.position, 'x', -5, 5, 0.1).name('Pos X');
  charFolder.add(character.position, 'y', 0, 5, 0.1).name('Pos Y');
  charFolder.add(character.position, 'z', -5, 5, 0.1).name('Pos Z');
  charFolder.add(character.rotation, 'y', -Math.PI, Math.PI, 0.1).name('Rotation Y');
  charFolder.open();
});

// === Raycaster + Pointer ===
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// === Debug Hotkey ===
window.addEventListener('keydown', (e) => {
  if (e.key === 'p') {
    decorativeModels.forEach((model, i) => {
      console.log(`Model ${i + 1}:`);
      console.log('  position:', model.position.toArray().map(v => +v.toFixed(2)));
      console.log('  rotation:', [
        +model.rotation.x.toFixed(2),
        +model.rotation.y.toFixed(2),
        +model.rotation.z.toFixed(2)
      ]);
      console.log('  scale:', model.scale.toArray().map(v => +v.toFixed(2)));
    });
  }
});

function createSnow() {
    const snowParticleCount = 2000;
    const snowParticleSize = 0.1;
    const snowAreaSize = 50;

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: snowParticleSize,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false
    });

    const positions = new Float32Array(snowParticleCount * 3);
    const sizes = new Float32Array(snowParticleCount);
    const rotations = new Float32Array(snowParticleCount);
    const speeds = new Float32Array(snowParticleCount);

    for (let i = 0; i < snowParticleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * snowAreaSize;
        positions[i * 3 + 1] = Math.random() * snowAreaSize;
        positions[i * 3 + 2] = (Math.random() - 0.5) * snowAreaSize;
        sizes[i] = snowParticleSize * (0.5 + Math.random() * 0.5);
        rotations[i] = Math.random() * Math.PI * 2;
        speeds[i] = 0.5 + Math.random() * 0.5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particlesGeometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
    particlesGeometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    const snowParticles = new THREE.Points(particlesGeometry, particlesMaterial);
    snowParticles.frustumCulled = false;
    scene.add(snowParticles);

    return {
        object: snowParticles,
        update: function(delta) {
            const positions = snowParticles.geometry.attributes.position.array;
            const rotations = snowParticles.geometry.attributes.rotation.array;

            for (let i = 0; i < snowParticleCount; i++) {
                positions[i * 3 + 1] -= speeds[i] * delta * 30;
                rotations[i] += 0.001 * delta * 30;

                if (positions[i * 3 + 1] < -5) {
                    positions[i * 3] = (Math.random() - 0.5) * snowAreaSize;
                    positions[i * 3 + 1] = snowAreaSize;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * snowAreaSize;
                }
            }

            snowParticles.geometry.attributes.position.needsUpdate = true;
            snowParticles.geometry.attributes.rotation.needsUpdate = true;
        }
    };
}

const snow = createSnow();

const clock = new THREE.Clock();

function animate() {
    if (!isARMode) {
        requestAnimationFrame(animate);
        
        // Update physics
        world.step(timeStep);
        
        // Update marbles
        marbles.forEach((marble, index) => {
            if (marble.mesh) {
                marble.mesh.position.copy(marble.body.position);
                marble.mesh.quaternion.copy(marble.body.quaternion);
            }
        });
        
        // Update animations
        if (sushiMixer) sushiMixer.update(clock.getDelta());
        controls.update();
        mixers.forEach(m => m.update(clock.getDelta()));
        characterMixer?.update(clock.getDelta());
        snow.update(clock.getDelta());
        
        // Render
        renderer.render(scene, camera);
    }
}

animate();
