import {ShadowConstants, ControlTypes} from '/constants.js';
import * as EVENTS from '/windowEvents.js';

import * as THREE from '/three/build/three.module.js';
import {FlyControls} from '/three/examples/jsm/controls/FlyControls.js';
import {OrbitControls} from '/three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';

// Camera Toggler
const CameraIndex = {
	active: 0,
	next: 1,
	orbitIndex: 2
};

let activeScene;
let clock;

// Lists
let cameras = [], scenes = [], renderers = [];

// Canvases
let mainCanvas, secondaryCanvas;

// GUI
let orbitTargetUI, orbitModeUI;
let orbitTargetTextUI, orbitModeTextUI;

// Control
let controls = {
	active: null,
	type: ControlTypes.FLY,
	orbitIndex: 0,
	orbitException: []
};

// Loading Variables
let loadingManager;
let finishLoading;
let loadScreen;
let loadProgress;
let loadError;

let gltfLoader;

// Objects
const maxHouse = 6;
let copIndex = -1;
const objectList = [];

// Lightings
let directionalLight;
let ambientLight;

// Misc
let orbitDirection = new THREE.Vector3();

/**
*	Initiate variables for ThreeJS to keep and run
*/
function init() {
	// Initate new clock
	clock = new THREE.Clock();
	
	// Initiate new cameras
	let newCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
	newCamera.position.y = 20;
	newCamera.position.z = -25;
	newCamera.lookAt(0, 0, 0);
	cameras.push(newCamera);
	
	newCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
	newCamera.position.y = 1;
	newCamera.position.x = -5;
	newCamera.lookAt(0, 0, 0);
	cameras.push(newCamera);
	
	newCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
	newCamera.position.y = 1;
	newCamera.position.z = 5;
	newCamera.lookAt(0, 0, 0);
	cameras.push(newCamera);
	
	// Initate new scenes
	let cubeLoader = new THREE.CubeTextureLoader(); // Get the skybox textures
	cubeLoader.setPath('models/skybox/');
	
	const textureBox = cubeLoader.load([
		'right.png', 'left.png',
		'top.png', 'bottom.png',
		'front.png', 'back.png'
	]);
	
	let newScene = new THREE.Scene();
	newScene.background = textureBox;
	newScene.name = 'mainScene';
	scenes.push(newScene);
	
	newScene = new THREE.Scene();
	newScene.name = 'secondaryScene';
	scenes.push(newScene);
	
	activeScene = scenes[0];
	
	// Initiate new renderers
	mainCanvas = document.querySelector('#mainCanvas'); // Get the mainCanvas
	
	let newRenderer = new THREE.WebGLRenderer({ canvas: mainCanvas, antialias: true });
	newRenderer.setSize(window.innerWidth, window.innerHeight);
	newRenderer.toneMapping = THREE.ACESFilmicToneMapping;
	newRenderer.outputEncoding = THREE.sRGBEncoding;
	newRenderer.physicallyCorrectLights = true;
	newRenderer.shadowMap.enabled = true;
	newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderers.push(newRenderer);
	
	secondaryCanvas = document.querySelector('#secondaryCanvas'); // Get the secondaryCanvas
	newRenderer = new THREE.WebGLRenderer({ canvas: secondaryCanvas, antialias: true });
	newRenderer.setSize(window.innerWidth/4, window.innerHeight/4);
	newRenderer.toneMapping = THREE.ACESFilmicToneMapping;
	newRenderer.outputEncoding = THREE.sRGBEncoding;
	newRenderer.physicallyCorrectLights = true;
	newRenderer.shadowMap.enabled = true;
	newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderers.push(newRenderer);
	
	// Initate Lightings
	controls.orbitException.push('sunLight'); // Add to the exception of orbiting
	directionalLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
	directionalLight.name = 'sunLight';
	directionalLight.castShadow = true;
	directionalLight.position.set(0, 100, -40);
	directionalLight.shadow.mapSize.width = 1024;
	directionalLight.shadow.mapSize.height = 1024;
	directionalLight.shadow.camera.left = -100;
	directionalLight.shadow.camera.bottom = -100;
	directionalLight.shadow.camera.right = 100;
	directionalLight.shadow.camera.top = 100;
	directionalLight.shadow.camera.near = 0.2;
	directionalLight.shadow.camera.far = 200;
	scenes[0].add(directionalLight);
	
	controls.orbitException.push('ambientLight'); // Add to the exception of orbiting
	ambientLight = new THREE.AmbientLight(new THREE.Color('#FFFFFF'), 0.2);
	ambientLight.name = 'ambientLight';
	scenes[0].add(ambientLight);
	
	// Initate Loading Manager
	loadScreen = document.querySelector('#loading-screen');
	loadProgress = document.querySelector('#load-progress');
	loadError = document.querySelector('#loading-error');
	
	loadingManager = new THREE.LoadingManager(() => {
		finishLoading = true;
		
		// DOM Manipulation to remove the loading screen when finished
		loadScreen.classList.add('fade-out');
		loadScreen.addEventListener('transitionend', (event) => {
			event.target.remove();
		});
	},
	(url, itemLoaded, itemTotal) => {
		loadProgress.style.width = `${itemLoaded / itemTotal * 100}%`;
	},
	(url) => {
		loadError.style.display = 'block';
		loadError.style.textAlign = 'center';
		loadError.style.color = 'red';
		
		console.log('Error loading assets.');
	});
	
	// Initiate load assets
	gltfLoader = new GLTFLoader(loadingManager);
	
	// Load the terrain
	let loadCounter = 0;
	objectList.push({});
	gltfLoader.load('models/terrain/terrain.glb', (glb) => {
		const loadIndex = loadCounter;
		loadCounter = loadCounter+1;
		// console.log(glb, 'terrain');
		controls.orbitException.push('terrain'); // Add to the exception of orbiting

		objectList[loadIndex].scene = glb.scene;
		objectList[loadIndex].name = 'terrain';
		objectList[loadIndex].animations = glb.animations;
		objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
		objectList[loadIndex].scene.position.set(0, -0.04, 0);
		objectList[loadIndex].scene.scale.set(5, 5, 5);
		objectList[loadIndex].scene.receiveShadow = true;
		
		loopShadow(objectList[loadIndex].scene.children, ShadowConstants.RECEIVE_SHADOW);
		
		scenes[0].add(objectList[loadIndex].scene.children[0]);
	});
	
	// Load the cop
	objectList.push({});
	gltfLoader.load('models/cop/scene.gltf', (gltf) => {
		const loadIndex = loadCounter;
		loadCounter = loadCounter+1;
		objectList[loadIndex].scene = gltf.scene;
		objectList[loadIndex].animations = gltf.animations;
		objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
		objectList[loadIndex].name = 'cop';
		objectList[loadIndex].scene.castShadow = true;
		objectList[loadIndex].scene.receiveShadow = true;
		
		// Custom Cop Variable
		objectList[loadIndex].state = 0;
		objectList[loadIndex].counter = 0;
		
		loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
		
		// Animation
		const clip = THREE.AnimationClip.findByName(objectList[loadIndex].animations, 'walking');
		// objectList[loadIndex].mixer.timeScale = 4;
		objectList[loadIndex].mixer.clipAction(clip).play();
		
		// console.log(objectList[loadIndex]);
		
		copIndex = loadIndex;
		scenes[0].add(objectList[loadIndex].scene);
	});
	
	// Object Placement Setting
	const objectPlacementX = [40,30,-30,-40];
	const objectPlacementZ = [10,-20,-20,10];
	const objectRotationY = [-120,-90,90,120];
	// Load the house a few times until maxHouse is reached in a round area
	for (let i = 0; i < 4; i++) {
		objectList.push({});
		gltfLoader.load('models/house/scene.gltf', (gltf) => {
			const loadIndex = loadCounter;
			loadCounter = loadCounter+1;
			// console.log(gltf, 'House' + i);
			objectList[loadIndex].scene = gltf.scene;
			objectList[loadIndex].animations = gltf.animations || null;
			objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
			objectList[loadIndex].name = 'house' + (i+1);
			objectList[loadIndex].scene.position.set(objectPlacementX[i], 0, objectPlacementZ[i]);
			objectList[loadIndex].scene.rotation.y = objectRotationY[i] * Math.PI/180;
			objectList[loadIndex].scene.scale.set(1.8, 1.8, 1.8);
			
			loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			scenes[0].add(objectList[loadIndex].scene);
		});
	}
	// Load mountain
	{
		// Object Mountain Placement Setting
		const mountainPlacementX = [-50,50];
		const mountainPlacementZ = [80,80];
		const mountainRotationY = [45,135];
		for (let i = 0; i < 2; i++) {
			objectList.push({});
			gltfLoader.load('models/mountain/scene.gltf', (gltf) => {
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'mountain';
				objectList[loadIndex].scene.position.set(mountainPlacementX[i], 38, mountainPlacementZ[i]);
				objectList[loadIndex].scene.rotation.y = mountainRotationY[i] * Math.PI/180;
				
				objectList[loadIndex].scene.scale.set(8, 8, 8);
				
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				
				
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
				
				// console.log(objectList[loadIndex]);
				
				scenes[0].add(objectList[loadIndex].scene);
			});
		}
	}

	// Load Statue
	{
		const statuePlacementX = [-10,10];
		for (let i = 0; i < 2; i++) {
			objectList.push({});
			gltfLoader.load('models/statueAlliance/scene.gltf', (gltf) => {
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'statue alliance';
				objectList[loadIndex].scene.position.set(statuePlacementX[i], 0, -30);
				objectList[loadIndex].scene.scale.set(0.02, 0.02, 0.02);
				// objectList[loadIndex].scene.rotation.y = 45 * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
				
				// console.log(objectList[loadIndex]);
				
				scenes[0].add(objectList[loadIndex].scene);
			});
		}
	}
	// Load Ancient Tree
	{
		const ancientTreePlacementX = [5,25,-25];
		const ancientTreePlacementZ = [50,38,30];
		
		for (let i = 0; i < 3; i++) {
			objectList.push({});
			gltfLoader.load('models/ancient_tree/scene.gltf', (gltf) => {
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'ancient tree';
				objectList[loadIndex].scene.position.set(ancientTreePlacementX[i], 0, ancientTreePlacementZ[i]);
				objectList[loadIndex].scene.scale.set(0.02,0.02,0.02);
				// objectList[loadIndex].scene.rotation.y = 45 * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
				
				// console.log(objectList[loadIndex]);
				
				scenes[0].add(objectList[loadIndex].scene);
			});
		}
	}
	// Load Ancient Lamp
	{
		const ancientLampPlacementX = [35,-35];
		const ancientLampPlacementZ = [-5,-5];
		for (let i = 0; i < 2; i++) {
			objectList.push({});
			gltfLoader.load('models/ancient_lamp/scene.gltf', (gltf) => {
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'ancient lamp';
				objectList[loadIndex].scene.position.set(ancientLampPlacementX[i], 5, ancientLampPlacementZ[i]);
				objectList[loadIndex].scene.scale.set(1, 1, 1);
				// objectList[loadIndex].scene.rotation.y = 45 * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
				
				// console.log(objectList[loadIndex]);
				
				scenes[0].add(objectList[loadIndex].scene);
			});
		}
	}
	// Load fountain
	{
		objectList.push({});
		gltfLoader.load('models/fountain/scene.gltf', (gltf) => {
			const loadIndex = loadCounter;
			loadCounter = loadCounter+1;
			objectList[loadIndex].scene = gltf.scene;
			objectList[loadIndex].animations = gltf.animations;
			objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
			objectList[loadIndex].name = 'fountain';
			objectList[loadIndex].scene.position.set(0, -0.5, 0);
			objectList[loadIndex].scene.scale.set(0.02, 0.02, 0.02);
			// objectList[loadIndex].scene.rotation.y = 45 * Math.PI/180;
			objectList[loadIndex].scene.castShadow = true;
			objectList[loadIndex].scene.receiveShadow = true;
			loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			// console.log(objectList[loadIndex]);
			
			scenes[0].add(objectList[loadIndex].scene);
		});
	}

	// Load Water Tower
	{
		const towerPlacementX = [45,-45];
		const towerPlacementZ = [-10,-10];
		for (let i = 0; i < 2; i++) {
			objectList.push({});
			gltfLoader.load('models/water_tower/scene.gltf', (gltf) => {
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'water tower';
				objectList[loadIndex].scene.position.set(towerPlacementX[i], 0, towerPlacementZ[i]);
				objectList[loadIndex].scene.scale.set(1, 1, 1);
				// objectList[loadIndex].scene.rotation.y = 45 * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
				
				// console.log(objectList[loadIndex]);
				
				scenes[0].add(objectList[loadIndex].scene);
			});
		}

	}
	// Load Mid House
	{
		objectList.push({});
		gltfLoader.load('models/kades_house/scene.gltf', (gltf) => {
			const loadIndex = loadCounter;
			loadCounter = loadCounter+1;
			objectList[loadIndex].scene = gltf.scene;
			objectList[loadIndex].animations = gltf.animations;
			objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
			objectList[loadIndex].name = 'big house';
			objectList[loadIndex].scene.position.set(0, 0, 30);
			objectList[loadIndex].scene.scale.set(5, 5, 5);
			objectList[loadIndex].scene.rotation.y = 180 * Math.PI/180;
			objectList[loadIndex].scene.castShadow = true;
			objectList[loadIndex].scene.receiveShadow = true;
			loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			// console.log(objectList[loadIndex]);
			
			scenes[0].add(objectList[loadIndex].scene);
		});
	}
	// Load Stone Walkway
	{
		const stonePlacementX = [2,0,-2,2,0,-2,2,0,-2,2,0,-2];
		const stonePlacementZ = [-40,-40,-40,-30,-30,-30,-21,-21,-21,-11,-11,-11];
		const stoneRotationY = [90,-90,90,90,-90,90,90,-90,90,90,-90,90]
		for(let i = 0; i < 12; i++){
			objectList.push({});
			gltfLoader.load('models/stone_walkway/scene.gltf',(gltf)=>{
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList.mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'stone path';
				objectList[loadIndex].scene.position.set(stonePlacementX[i], 0, stonePlacementZ[i]);
				objectList[loadIndex].scene.scale.set(1, 1, 1);
				objectList[loadIndex].scene.rotation.y = stoneRotationY[i] * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			// console.log(objectList[loadIndex]);
			
			scenes[0].add(objectList[loadIndex].scene);
			})
		}
	}
	// Load Rock Fence
	{
		const rockFencePlacementX = [-6,-14.5,-9,-9,6,14,9,9];
		const rockFencePlacementZ = [-31,-31,-35,-26,-31,-31,-35,-26];
		const rockFenceRotationY = [90,90,0,0,90,90,180,180]
		for(let i = 0; i < 8; i++){
			objectList.push({});
			gltfLoader.load('models/fence_rock/scene.gltf',(gltf)=>{
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList.mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'fence rock';
				objectList[loadIndex].scene.position.set(rockFencePlacementX[i], 0, rockFencePlacementZ[i]);
				objectList[loadIndex].scene.scale.set(0.02, 0.02, 0.02);
				objectList[loadIndex].scene.rotation.y = rockFenceRotationY[i] * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			// console.log(objectList[loadIndex]);
			
			scenes[0].add(objectList[loadIndex].scene);
			})
		}
	}
	// Load Stone Wall
	{
		const stoneWallPlacementX = [50,-50,50,-50];
		const stoneWallPlacementZ = [20,20,-23,-23];
		const stoneWallRotationY = [60,120,-60,-120]
		for(let i = 0; i < 4; i++){
			objectList.push({});
			gltfLoader.load('models/stone_wall/scene.gltf',(gltf)=>{
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList.mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'stone wall';
				objectList[loadIndex].scene.position.set(stoneWallPlacementX[i], 0, stoneWallPlacementZ[i]);
				objectList[loadIndex].scene.scale.set(0.05, 0.05, 0.05);
				objectList[loadIndex].scene.rotation.y = stoneWallRotationY[i] * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			// console.log(objectList[loadIndex]);
			
			scenes[0].add(objectList[loadIndex].scene);
			})
		}
	}
	// Load Forest
	{
		const forestPlacementX = [-50,49];
		const forestPlacementZ = [-72,-70];
		const forestRotationY = [0,180]
		for(let i = 0; i < 2; i++){
			objectList.push({});
			gltfLoader.load('models/forest/scene.gltf', (gltf) => {
				const loadIndex = loadCounter;
				loadCounter = loadCounter+1;
				objectList[loadIndex].scene = gltf.scene;
				objectList[loadIndex].animations = gltf.animations;
				objectList[loadIndex].mixer = new THREE.AnimationMixer(objectList[loadIndex].scene);
				objectList[loadIndex].name = 'forest';
				objectList[loadIndex].scene.position.set(forestPlacementX[i], 0.01, forestPlacementZ[i]);
				objectList[loadIndex].scene.scale.set(6.4, 4, 4);
				objectList[loadIndex].scene.rotation.y = forestRotationY[i] * Math.PI/180;
				objectList[loadIndex].scene.castShadow = true;
				objectList[loadIndex].scene.receiveShadow = true;
				loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
				
				// console.log(objectList[loadIndex]);
				
				scenes[0].add(objectList[loadIndex].scene);
			});
		}
	}
	
	// Initiate the GUI
	orbitTargetUI = document.querySelector('#orbitTarget');
	orbitModeUI = document.querySelector('#orbitMode');
	orbitTargetTextUI = orbitTarget.querySelector('#orbitText');
	orbitModeTextUI = orbitMode.querySelector('#orbitModeText');
	orbitModeUI.style.display = 'block';
	
	// Initiate the controls
	changeToFly();
	
	// Register Events
	EVENTS.resizeCanvasesEvent(renderers[0], renderers[1]);
	EVENTS.switchCameraEvent(cameras, controls, CameraIndex, objectList);
	switchControlEvent(controls, cameras, CameraIndex, renderers[0], clock);
}

// Set all children to be able to cast and receive shadow
// Use the ShadowConstants as the type argument
function loopShadow(children, type) {
	children.forEach((obj) => {
		if (type >= ShadowConstants.CULL_FRUSTUM)
			obj.frustumCulled = false;
		
		if (type == ShadowConstants.RECEIVE_SHADOW || type == ShadowConstants.CAST_RECEIVE)
			obj.receiveShadow = true;
		
		if (type == ShadowConstants.CAST_SHADOW || type == ShadowConstants.CAST_RECEIVE)
			obj.castShadow = true;
		
		if (obj.children.length > 0) loopShadow(obj.children, type);
	});
}

// Change the control into orbit camera mode
function changeToOrbit() {
	if (controls.active) controls.active.dispose(); // Remove all resources for the control
	
	CameraIndex.active = cameras.length-1;
	controls.active = new OrbitControls(cameras[CameraIndex.active], renderers[0].domElement);
	controls.active.enablePan = false;	// Disable to enable manual position override of camera
	controls.active.enableZoom = false; // Disable to enable manual position override of camera
	controls.active.rollSpeed = 0.4;
	controls.active.update();
	controls.type = ControlTypes.ORBIT;
	
	// Set the camera position
	let objectX = objectList[controls.orbitIndex].scene.position.x - 15;
	let objectY = objectList[controls.orbitIndex].scene.position.y + 2;
	let objectZ = objectList[controls.orbitIndex].scene.position.z - 15;
	cameras[CameraIndex.orbitIndex].position.set(objectX, objectY, objectZ);
	
	controls.active.target = objectList[controls.orbitIndex].scene.position;
	controls.active.update();
	
	// Update the GUI
	orbitModeTextUI.innerText = 'Mode: Orbit';
	
	orbitTargetUI.style.display = 'block';
	orbitTargetTextUI.innerText = `Target: ${objectList[controls.orbitIndex].name}`;
}

// Change the control into fly camera mode
function changeToFly() {
	if(controls.active) controls.active.dispose(); // Remove all resources for the control
	
	CameraIndex.active = (CameraIndex.next-1 < 0) ? CameraIndex.orbitIndex-1 : CameraIndex.next-1;
	controls.active = new FlyControls(cameras[CameraIndex.active], renderers[0].domElement);
	controls.active.movementSpeed = 10;
	controls.active.dragToLook = true;
	controls.active.rollSpeed = 1;
	controls.active.update(clock.getDelta());
	controls.type = ControlTypes.FLY;
	
	// Update the GUI
	orbitModeTextUI.innerText = 'Mode: Fly';
	orbitTargetUI.style.display = 'none';
}

// Switch the view into the orbital camera targeting an object
// Use the ControlTypes Constants to compare the type of the control being used
function switchControlEvent() {
	window.addEventListener('keypress', (event) => {
		// console.log(event);
		if (event.key === 'v' || event.key === 'V') {
			if (controls.type === ControlTypes.FLY) {
				changeToOrbit();
			}
			else if (controls.type === ControlTypes.ORBIT) {
				changeToFly();
			}
		}
	});
}

function animate() {
	// Secondary Renderer
	renderers[0].setAnimationLoop((timestamp) => {
		// console.log(timestamp);
		
		if (controls.active) controls.active.update(clock.getDelta());
		
		renderers[0].render(activeScene, cameras[CameraIndex.active]);
	});
	renderers[1].setAnimationLoop((timestamp) => {
		// console.log(timestamp);
		
		if (controls.active) controls.active.update(clock.getDelta());
		
	});
}

init();
const timer = setInterval(() => {
	// Update animations
	for (let i = 0; i < objectList.length; i++) {
		if (objectList[i].mixer) {
			objectList[i].mixer.update(1/32);
		}
	}
	
	// Update Cop position and rotation
	if (objectList[copIndex]) {
		const moveDegree = objectList[copIndex].counter++ / 180;
		
		const offset = 15;
		objectList[copIndex].scene.position.x = offset * Math.cos(moveDegree);
		objectList[copIndex].scene.position.z = offset * Math.sin(moveDegree);
		objectList[copIndex].scene.rotation.y = -moveDegree;
		
		// console.log(-Math.PI/2 + -Math.PI * Math.cos(moveDegree));
	}
	
	if (controls.active) {
		if (controls.type === ControlTypes.ORBIT) {
			const camOffset = 12;
			
			orbitDirection.subVectors(cameras[CameraIndex.active].position, controls.active.target);
			orbitDirection.normalize().multiplyScalar(camOffset);
			orbitDirection.add(controls.active.target);
			cameras[CameraIndex.active].position.copy(orbitDirection);
		}
	}
	
	// Execute a render asyncronously because otherwise, rendering synchronously will not work
	renderers[1].render(activeScene, cameras[CameraIndex.next]);
}, 1000/32);
animate();
