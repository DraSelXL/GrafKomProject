import * as THREE from '/three/build/three.module.js';
import {FlyControls} from '/three/examples/jsm/controls/FlyControls.js';
import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialiased: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLight = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const controls = new FlyControls(camera, renderer.domElement);
controls.dragToLook = true;
controls.rollSpeed = 0.25;
controls.movementSpeed = 2.5;
controls.update(clock.getDelta());

const sunLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
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

// const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
// plane.rotation.x = -Math.PI / 2;
// plane.position.y = -2;
// plane.receiveShadow = true;
// scene.add(plane);

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial({ color: 0x00ffff }));
sphere.position.set(0, 0, 0);
sphere.castShadow = true;
scene.add(sphere);

const gltfLoader = new GLTFLoader();
let terrain;
gltfLoader.load('/models/terrain/terrain.glb', (glb) => {
	// console.log(glb.scene);
	
	terrain = glb.scene.children[0];
	terrain.position.set(0, -1.03, 0);
	terrain.scale.set(200, 1, 200);
	terrain.receiveShadow = true;
	
	scene.add(terrain);
}, undefined, (err) => {
	console.error(err);
});

let skydome;
gltfLoader.load('/models/skydome/Skydome.glb', (glb) => {
	// console.log(glb, "Skydome");
	
	skydome = glb.scene.children[0];
	skydome.position.y = -40;
	skydome.material = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('/models/skydome/Skydome.png') });
	skydome.material.side = THREE.backSide;
	// console.log(skydome.material);
	// skydome.receiveShadow = false;
	// skydome.castShadow = false;
	
	scene.add(skydome);
}, undefined, (err) => {
	console.error(err);
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
		controls.update(clock.getDelta());
		renderer.render(scene, camera);
	});
}
animate();