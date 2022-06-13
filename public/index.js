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
const maxHouse = 5;
const objectList = [];

// Lightings
let directionalLight;
let ambientLight;

/**
*	Initiate variables for ThreeJS to keep and run
*/
function init() {
	// Initate new clock
	clock = new THREE.Clock();
	
	// Initiate new cameras
	let newCamera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
	newCamera.position.y = 1;
	newCamera.position.z = -5;
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
	directionalLight.shadow.camera.left = -10;
	directionalLight.shadow.camera.bottom = -10;
	directionalLight.shadow.camera.right = 10;
	directionalLight.shadow.camera.top = 10;
	directionalLight.shadow.camera.near = 0.2;
	directionalLight.shadow.camera.far = 100;
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
		const loadIndex = loadCounter++;
		// console.log(glb, 'terrain');
		controls.orbitException.push('terrain'); // Add to the exception of orbiting

		objectList[loadIndex].scene = glb.scene;
		objectList[loadIndex].name = 'terrain';
		objectList[loadIndex].scene.position.set(0, -0.04, 0);
		objectList[loadIndex].scene.scale.set(5, 5, 5);
		objectList[loadIndex].scene.receiveShadow = true;
		
		loopShadow(objectList[loadIndex].scene.children, ShadowConstants.RECEIVE_SHADOW);
		
		scenes[0].add(objectList[loadIndex].scene.children[0]);
	});
	
	// Load the cop
	objectList.push({});
	gltfLoader.load('models/cop/scene.gltf', (gltf) => {
		const loadIndex = loadCounter++;
		objectList[loadIndex].scene = gltf.scene;
		objectList[loadIndex].animations = gltf.animations;
		objectList[loadIndex].name = 'cop';
		objectList[loadIndex].scene.castShadow = true;
		objectList[loadIndex].scene.receiveShadow = true;
		
		loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
		
		scenes[0].add(objectList[loadIndex].scene);
	});
	
	// Object Placement Setting
	const objectPlacementX = [0,30,30,0,-30,-30];
	const objectPlacementZ = [30,15,-15,-30,-15,15];
	const objectRotationY = [180,-120,-60,0,60,120];
	// Load the house a few times until maxHouse is reached in a round area
	for (let i = 0; i < maxHouse; i++) {
		objectList.push({});
		
		gltfLoader.load('models/house/scene.gltf', (gltf) => {
			const loadIndex = loadCounter++;
			// console.log(gltf, 'House' + i);
			objectList[loadIndex].scene = gltf.scene;
			objectList[loadIndex].animations = gltf.animations || null;
			objectList[loadIndex].name = 'house' + (i+1);
			objectList[loadIndex].scene.position.set(objectPlacementX[i], 0, objectPlacementZ[i]);
			objectList[loadIndex].scene.rotation.y = objectRotationY[i] * Math.PI/180;
			// console.log(Math.PI + i/maxHouse * Math.PI * 2);
			objectList[loadIndex].scene.scale.set(1.8, 1.8, 1.8);
			
			loopShadow(objectList[loadIndex].scene.children, ShadowConstants.CAST_RECEIVE);
			
			scenes[0].add(objectList[loadIndex].scene);
		});
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

function changeToOrbit() {
	// Change the control into orbit camera mode
	if (controls.active) controls.active.dispose(); // Remove all resources for the control
	
	CameraIndex.active = cameras.length-1;
	controls.active = new OrbitControls(cameras[CameraIndex.active], renderers[0].domElement);
	controls.active.enablePan = false;	// Disable to enable manual position override of camera
	controls.active.enableZoom = false; // Disable to enable manual position override of camera
	controls.active.rollSpeed = 0.4;
	controls.active.update();
	controls.type = ControlTypes.ORBIT;
	
	EVENTS.orbitCameraPosition(cameras, CameraIndex, objectList, controls); // Set the camera position
	
	// Update the GUI
	orbitModeTextUI.innerText = 'Mode: Orbit';
	
	orbitTargetUI.style.display = 'block';
	orbitTargetTextUI.innerText = `Target: ${objectList[controls.orbitIndex].name}`;
}

function changeToFly() {
	// Change the control into fly camera mode
	if(controls.active) controls.active.dispose(); // Remove all resources for the control
	
	CameraIndex.active = (CameraIndex.next-1 < 0) ? CameraIndex.orbitIndex-1 : CameraIndex.next-1;
	controls.active = new FlyControls(cameras[CameraIndex.active], renderers[0].domElement);
	controls.active.movementSpeed = 2.5;
	controls.active.dragToLook = true;
	controls.active.rollSpeed = 0.4;
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

function update() {
	
}

function animate() {
	// main renderer
	renderers[0].setAnimationLoop(() => {
		if (controls.active) {
			if (controls.type === ControlTypes.ORBIT) {
				
			}
			
			controls.active.update(clock.getDelta());
		}
		
		renderers[0].render(activeScene, cameras[CameraIndex.active]);
	});
	// Secondary Renderer
	renderers[1].setAnimationLoop(() => {
		renderers[1].render(activeScene, cameras[CameraIndex.next]);
	});
}

init();
const timer = setInterval(update, 1000 / 32);
animate();
