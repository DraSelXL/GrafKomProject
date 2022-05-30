import * as THREE from '/three/build/three.module.js';
import {OrbitControls} from '/three/examples/jsm/controls/OrbitControls.js';
import {FlyControls} from '/three/examples/jsm/controls/FlyControls.js';
import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';

let clock, activeScene, activeCamera, activeControl, renderer, gltfLoader;
let cameras, camIndex;
let sunLight;
let ambientLight;
let loadingLoader;

// Loaded objects
let terrain;
let skydome;
let warehouse;

// Loading variables
let finishLoading = false;

// Camera Variables
let cameraMode = 0; // 0 = Fly, 1 = Orbit
let cycleMesh = 0;
let flyControl;
let orbitControl;

initProgram();
animate();

console.log(activeScene);

function initProgram() {
	cameras = [];
	
	// Initiate Scene
	let scene = new THREE.Scene();
	activeScene = scene;
	
	// Initiate camera
	let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 500);
	camera.name = 'frontCamera';
	camera.position.set(0, 0, 5);
	camera.lookAt(0, 0, 0);
	cameras.push(camera);
	activeCamera = camera;
	camIndex = 0;
	
	camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 500);
	camera.name = 'sideCamera';
	camera.position.set(5, 0, 0);
	camera.lookAt(0, 0, 0);
	cameras.push(camera);
	
	// Initiate renderer
	renderer = new THREE.WebGLRenderer({ antialiased: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.outputEncoding = THREE.sRGBEncoding;
	// renderer.physicallyCorrectLight = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.body.appendChild(renderer.domElement);
	
	// Initiate Clock
	clock = new THREE.Clock();
	
	// Initiate Light
	sunLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
	sunLight.name = 'sunLight';
	sunLight.position.set(0.5, 10, 0);
	sunLight.castShadow = true;
	sunLight.shadow.mapSize.width = 512;
	sunLight.shadow.mapSize.height = 512;
	sunLight.shadow.camera.left = -10;
	sunLight.shadow.camera.bottom = -10;
	sunLight.shadow.camera.right = 10;
	sunLight.shadow.camera.top = 10;
	sunLight.shadow.camera.near = 0.2;
	sunLight.shadow.camera.far = 500;
	scene.add(sunLight);
	
	ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 ); // soft white light
	scene.add( ambientLight );
	
	// Initiate Meshes
	const sphere = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial({ color: 0x00ffff }));
	sphere.name = 'sphere';
	sphere.position.set(0, 0, 0);
	sphere.castShadow = true;
	scene.add(sphere);
	
	// Initiate Loading Manager
	loadingLoader = new THREE.LoadingManager(undefined, (url, loaded, total) => {
		const loadingScreen = document.querySelector('#loading-screen');
		const loadingBar = document.querySelector('#load-progress');
		
		let progress = loaded/total * 100;
		loadingBar.style.width = `${progress}%`;
		
		// console.log(`Loaded: ${loaded} / ${total}`);
		
		if (loaded === total) {
			loadingScreen.classList.add('fade-out');
			loadingScreen.addEventListener('transitionend', (event) => {
				event.target.remove();
			});
			finishLoading = true;
		}
	});
	
	// Load Meshes
	gltfLoader = new GLTFLoader(loadingLoader);
	
	gltfLoader.load('/models/terrain/terrain.glb', (glb) => {
		// console.log(glb.scene);
		
		terrain = glb.scene.children[0];
		terrain.position.set(0, -1.03, 0);
		terrain.name = 'grassTerrain';
		// terrain.scale.set(200, 1, 200);
		terrain.receiveShadow = true;
		
		scene.add(terrain);
	}, undefined, (err) => {
		console.error(err);
	});

	gltfLoader.load('/models/skydome/Skydome.glb', (glb) => {
		// console.log(glb, "Skydome");
		
		skydome = glb.scene.children[0];
		skydome.position.y = -40;
		skydome.material = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('/models/skydome/Skydome.png') });
		skydome.material.side = THREE.backSide;
		skydome.name = 'skydome';
		// console.log(skydome.material);
		
		scene.add(skydome);
	}, undefined, (err) => {
		console.error(err);
	});

	gltfLoader.load('/models/warehouse/scene.gltf', (gltf) => {
		// console.log(gltf.scene.children[0].children[0], "Warehouse");
		
		warehouse = gltf.scene;
		warehouse.scale.set(0.01, 0.01, 0.01);
		warehouse.position.set(0, -1.04, -5);
		warehouse.children[0].children[0].children.forEach((obj) => {
			obj.castShadow = true;
			obj.receiveShadow = true;
		});
		warehouse.name = 'warehouse';
		console.log(warehouse);
		
		scene.add(warehouse);
	}, undefined, (err) => {
		console.error(err);
	});
	
	// Initiate Controls
	changeToFly();
}

// Change to fly control mode
function changeToFly() {
	if (orbitControl) orbitControl.dispose();
	
	flyControl = new FlyControls(activeCamera, renderer.domElement);
	flyControl.rollSpeed = 0.4;
	flyControl.movementSpeed = 2.5;
	flyControl.dragToLook = true;
	flyControl.update(clock.getDelta());
}

function changeToOrbit() {
	if (flyControl) flyControl.dispose();
	
	orbitControl = new OrbitControls(activeCamera, renderer.domElement);
	orbitControl.update();
}

// Resize Canvas on window
window.addEventListener('resize', () => {
	activeCamera.aspect = window.innerWidth / window.innerHeight;
	activeCamera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
});

// Timer to update things differently rather than update based on frames
const timer = setInterval(() => {
	if (skydome) skydome.rotation.z -= 0.002;
	
	// Rotate sunLight
	sunLight.position.x = 10 * Math.sin((Math.PI * Date.now() / 180) / 240 );
	sunLight.position.z = 10 * Math.cos((Math.PI * Date.now() / 180) / 240 );
}, 1000 / 32);

function animate() {
	renderer.setAnimationLoop(() => {
		if (flyControl) flyControl.update(clock.getDelta());
		else if (orbitControl) orbitControl.update(clock.getDelta());
		renderer.render(activeScene, activeCamera);
	});
}

// Document Events
const body = document.querySelector('body');
body.addEventListener('keypress', (event) => {
	console.log(event);
	
	const orbitTarget = document.querySelector('#orbitTarget');
	const orbitText = document.querySelector('#orbitText');
	
	if (event.key === 'x') {
		// if fly, change to orbit
		if (cameraMode === 0) {
			changeToOrbit();
			cameraMode = 1;
			orbitTarget.style.display = 'block';
			orbitText.innerText = 'Target: center';
		}
		// If orbit, cycle through meshes after that change to fly
		else if (cameraMode === 1) {
			let isValid = false;
			while (cameraMode === 1 && !isValid) {
				cycleMesh++;
				// console.log(cycleMesh);
				
				if (cycleMesh === activeScene.children.length) {
					cycleMesh = 0;
					cameraMode = 0;
					orbitTarget.style.display = 'none';
				}
				else if ('type' in activeScene.children[cycleMesh]){
					if (activeScene.children[cycleMesh].type === 'Mesh' || activeScene.children[cycleMesh].type === 'Group') isValid = true
				}
			}
			
			if (cameraMode === 0) changeToFly();
			else if (isValid) {
				orbitControl.target = activeScene.children[cycleMesh].position;
				orbitText.innerText = 'Target: ' + activeScene.children[cycleMesh].name;
			}
		}
	}
});