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

// Control
let controls = {
	active: null,
	type: 0,
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
	
	controls.orbitException.push('sunLight'); // Add to the exception of orbiting
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
	objectList.unshift({});
	gltfLoader.load('models/terrain/terrain.glb', (glb) => {
		// console.log(glb, 'terrain');
		controls.orbitException.push('terrain'); // Add to the exception of orbiting

		objectList[0].scene = glb.scene;
		objectList[0].name = 'terrain';
		objectList[0].scene.position.set(0, -0.04, 0);
		objectList[0].scene.scale.set(5, 5, 5);
		objectList[0].scene.receiveShadow = true;
		
		loopShadow(objectList[0].scene.children, ShadowConstants.RECEIVE_SHADOW);
		
		scenes[0].add(objectList[0].scene.children[0]);
	});
	
	// Load the cop
	objectList.unshift({});
	gltfLoader.load('models/cop/scene.gltf', (gltf) => {
		objectList[0].scene = gltf.scene;
		objectList[0].animations = gltf.animations;
		objectList[0].name = 'cop';
		objectList[0].scene.castShadow = true;
		objectList[0].scene.receiveShadow = true;
		
		loopShadow(objectList[0].scene.children, ShadowConstants.CAST_RECEIVE);
		
		scenes[0].add(objectList[0].scene);
	});
	
	// Load the house a few times until maxHouse is reached in a round area
	for (let i = 0; i < maxHouse; i++) {
		objectList.unshift({});
		
		gltfLoader.load('models/house/scene.gltf', (gltf) => {
			// console.log(gltf, 'House' + i);
			objectList[i].scene = gltf.scene;
			objectList[i].animations = gltf.animations || null;
			objectList[i].name = 'house' + (i+1);
			objectList[i].scene.position.set(20 * Math.sin(180/maxHouse * i), 0, 20 * Math.cos(180/maxHouse * i));
			objectList[i].scene.rotation.y = Math.PI + (Math.PI / maxHouse) * i;
			// console.log(Math.PI + i/maxHouse * Math.PI * 2);
			objectList[i].scene.scale.set(1.8, 1.8, 1.8);
			
			loopShadow(objectList[i].scene.children, ShadowConstants.CAST_RECEIVE);
			
			scenes[0].add(objectList[i].scene);
		});
	}
	
	// Initiate the controls
	EVENTS.changeToFly(controls, cameras, CameraIndex, renderers[0], clock);
	
	// Register Events
	EVENTS.resizeCanvasesEvent(renderers[0], renderers[1]);
	EVENTS.switchCameraEvent(cameras, CameraIndex, controls, objectList);
	EVENTS.switchControlEvent(controls, cameras, CameraIndex, renderers[0], clock);
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

function update() {
	
}

function animate() {
	// main renderer
	renderers[0].setAnimationLoop(() => {
		if (controls.active) controls.active.update(clock.getDelta());
		
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





































// import * as THREE from '/three/build/three.module.js';
// import {OrbitControls} from '/three/examples/jsm/controls/OrbitControls.js';
// import {controls.actives} from '/three/examples/jsm/controls/controls.actives.js';
// import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';

// let clock, activeScene, activeCamera, controls.active, renderer, gltfLoader;
// let cameras, camIndex;
// let sunLight;
// let ambientLight;
// let loadingLoader;

// // Loaded objects
// let terrain;
// let skydome;
// let city;
// let cop = {};

// // Shadow Variables
// const FRUSTUM = 0;
// const RECEIVE = 1;
// const CAST_RECEIVE = 2;

// // Loading variables
// let finishLoading = false;

// // Camera Variables
// let cameraMode = 0; // 0 = Fly, 1 = Orbit
// let cycleMesh = 0;
// let controls.active;
// let orbitControl;

// initProgram();
// animate();

// console.log(activeScene);

// function initProgram() {
	// cameras = [];
	
	// // Initiate Scene
	// let scene = new THREE.Scene();
	// activeScene = scene;
	
	// // Initiate camera
	// let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 500);
	// camera.name = 'frontCamera';
	// camera.position.set(0, 0, 5);
	// camera.lookAt(0, 0, 0);
	// cameras.push(camera);
	// activeCamera = camera;
	// camIndex = 0;
	
	// camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 500);
	// camera.name = 'sideCamera';
	// camera.position.set(5, 0, 0);
	// camera.lookAt(0, 0, 0);
	// cameras.push(camera);
	
	// // Initiate renderer
	// renderer = new THREE.WebGLRenderer({ antialiased: true });
	// renderer.setSize(window.innerWidth, window.innerHeight);
	// renderer.toneMapping = THREE.ACESFilmicToneMapping;
	// renderer.outputEncoding = THREE.sRGBEncoding;
	// renderer.physicallyCorrectLight = true;
	// renderer.shadowMap.enabled = true;
	// renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	// document.body.appendChild(renderer.domElement);
	
	// // Initiate Clock
	// clock = new THREE.Clock();
	
	// // Initiate Light
	// sunLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
	// sunLight.name = 'sunLight';
	// sunLight.position.set(0.5, 10, 0);
	// sunLight.castShadow = true;
	// sunLight.shadow.mapSize.width = 1024;
	// sunLight.shadow.mapSize.height = 1024;
	// sunLight.shadow.camera.left = -10;
	// sunLight.shadow.camera.bottom = -10;
	// sunLight.shadow.camera.right = 10;
	// sunLight.shadow.camera.top = 10;
	// sunLight.shadow.camera.near = 0.2;
	// sunLight.shadow.camera.far = 500;
	// scene.add(sunLight);
	
	// ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 ); // soft white light
	// scene.add( ambientLight );
	
	// // Initiate Meshes
	// const sphere = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial({ color: 0x00ffff }));
	// sphere.name = 'sphere';
	// sphere.position.set(-3, 0, 0);
	// sphere.castShadow = true;
	// scene.add(sphere);
	
	// // Initiate Loading Manager
	// loadingLoader = new THREE.LoadingManager(undefined, (url, loaded, total) => {
		// const loadingScreen = document.querySelector('#loading-screen');
		// const loadingBar = document.querySelector('#load-progress');
		
		// let progress = loaded/total * 100;
		// loadingBar.style.width = `${progress}%`;
		
		// // console.log(`Loaded: ${loaded} / ${total}`);
		
		// if (loaded === total) {
			// loadingScreen.classList.add('fade-out');
			// loadingScreen.addEventListener('transitionend', (event) => {
				// event.target.remove();
			// });
			// finishLoading = true;
		// }
	// });
	
	// // Load Meshes
	// gltfLoader = new GLTFLoader(loadingLoader);
	
	// gltfLoader.load('/models/terrain/terrain.glb', (glb) => {
		// // console.log(glb.scene);
		
		// terrain = glb.scene.children[0];
		// terrain.position.set(0, -1.03, 0);
		// terrain.name = 'grassTerrain';
		// terrain.scale.set(225, 1, 225);
		// terrain.receiveShadow = true;
		
		// scene.add(terrain);
	// }, undefined, (err) => {
		// console.error(err);
	// });

	// gltfLoader.load('/models/skydome/Skydome.glb', (glb) => {
		// // console.log(glb, "Skydome");
		
		// skydome = glb.scene.children[0];
		// skydome.position.y = -40;
		// skydome.material = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('/models/skydome/Skydome.png') });
		// skydome.material.side = THREE.backSide;
		// skydome.name = 'skydome';
		// // console.log(skydome.material);
		
		// scene.add(skydome);
	// }, undefined, (err) => {
		// console.error(err);
	// });

	// gltfLoader.load('/models/cop/scene.gltf', (gltf) => {
		// // console.log(gltf, "Cop");
		
		// cop.scene = gltf.scene;
		// cop.scene.position.y = -0.6;
		// cop.scene.name = 'cop';
		
		// loopShadow(cop.scene.children, CAST_RECEIVE);
		
		// // Animation System
		// cop.animations = gltf.animations;
		// cop.mixer = new THREE.AnimationMixer(cop.scene);
		// cop.mixer.timeScale = 1.4;
		// cop.clip = THREE.AnimationClip.findByName( cop.animations, 'walking' );
		// cop.action = cop.mixer.clipAction( cop.clip );
		// cop.action.play();
		
		// cop.state = 1;
		// cop.maxDistance = 20;
		
		// scene.add(cop.scene);
	// }, undefined, (err) => {
		// console.error(err);
	// });

	// gltfLoader.load('/models/city/scene.gltf', (gltf) => {
		// console.log(gltf, "City");
		
		// city = gltf.scene;
		// city.scale.set(30, 30, 30);
		// city.position.y = 45.33;
		// city.name = 'city';
		// city.castShadow = true;
		// city.receiveShadow = true;
		
		// loopShadow(city.children[0].children, CAST_RECEIVE);
		
		// scene.add(city);
	// }, undefined, (err) => {
		// console.error(err);
	// });
	
	// // Initiate Controls
	// changeToFly();
// }

// function loopShadow(children, type) {
	// children.forEach((obj) => {
		// obj.frustumCulled = false;
		// obj.receiveShadow = true;
		// obj.castShadow = true;
		
		// if (obj.children.length > 0) loopShadow(obj.children);
	// });
// }

// // Change to fly control mode
// function changeToFly() {
	// if (orbitControl) orbitControl.dispose();
	
	// controls.active = new controls.actives(activeCamera, renderer.domElement);
	// controls.active.rollSpeed = 0.4;
	// controls.active.movementSpeed = 2.5;
	// controls.active.dragToLook = true;
	// controls.active.update(clock.getDelta());
// }

// // Change to fly control mode
// function changeToOrbit() {
	// if (controls.active) controls.active.dispose();
	
	// orbitControl = new OrbitControls(activeCamera, renderer.domElement);
	// orbitControl.enablePan = false;
	
	// orbitControl.update();
// }

// // Resize Canvas on window
// window.addEventListener('resize', () => {
	// activeCamera.aspect = window.innerWidth / window.innerHeight;
	// activeCamera.updateProjectionMatrix();

	// renderer.setSize( window.innerWidth, window.innerHeight );
// });

// // Timer to update things differently rather than update based on frames
// const timer = setInterval(() => {
	// if (skydome) skydome.rotation.z -= 0.002;
	
	// // Rotate sunLight
	// sunLight.position.x = 10 * Math.sin((Math.PI * Date.now() / 180) / 240 );
	// sunLight.position.z = 10 * Math.cos((Math.PI * Date.now() / 180) / 240 );
		
	// // Animation mixer
	// if ('mixer' in cop) {
		// cop.scene.position.z += cop.state * (cop.scene.scale.y * 0.0225);
		
		// if (cop.scene.position.z >= cop.maxDistance || cop.scene.position.z <= -cop.maxDistance) {
			// cop.scene.position.z = cop.state * (cop.maxDistance - 0.02 * cop.state);
			// cop.scene.rotation.y = Math.PI/2 * (1+cop.state);
			// cop.state *= -1;
		// }
		// cop.mixer.update(clock.getDelta());
	// }
// }, 1000 / 32);

// function animate() {
	// renderer.setAnimationLoop(() => {
		// if (controls.active) controls.active.update(clock.getDelta());
		// else if (orbitControl) orbitControl.update();
		
		// renderer.render(activeScene, activeCamera);
	// });
// }

// // Document Events
// const body = document.querySelector('body');
// body.addEventListener('keypress', (event) => {
	// // console.log(event);
	
	// const orbitTarget = document.querySelector('#orbitTarget');
	// const orbitText = document.querySelector('#orbitText');
	
	// // Change the view when the x button is pressed
	// if (event.key === 'x') {
		// // if fly, change to orbit
		// if (cameraMode === 0) {
			// changeToOrbit();
			
			// cameraMode = 1;
			// orbitTarget.style.display = 'block';
			// orbitText.innerText = 'Target: center';
		// }
		// // If orbit, cycle through meshes after that change to fly
		// else if (cameraMode === 1) {
			// // activeScene.children[cycleMesh].remove(activeCamera);
			
			// let isValid = false;
			// while (cameraMode === 1 && !isValid) {
				// cycleMesh++;
				// // console.log(cycleMesh);
				
				// if (cycleMesh === activeScene.children.length) {
					// cycleMesh = 0;
					// cameraMode = 0;
					// orbitTarget.style.display = 'none';
				// }
				// else if ('name' in activeScene.children[cycleMesh]) {
					// if (activeScene.children[cycleMesh].name === 'city')
						// isValid = true
				// }
			// }
			
			// if (cameraMode === 0) {
				// changeToFly();
			// }
			// else if (isValid) {
				// // activeScene.children[cycleMesh].add(activeCamera);
				// orbitControl.target = activeScene.children[cycleMesh].position;
				
				// // console.log(activeCamera);
				
				// orbitText.innerText = 'Target: ' + activeScene.children[cycleMesh].name;
			// }
		// }
	// }
// });