import { ControlTypes } from '/constants.js';

import {WebGLRenderer} from '/three/build/three.module.js';
import {FlyControls} from '/three/examples/jsm/controls/FlyControls.js';
import {OrbitControls} from '/three/examples/jsm/controls/OrbitControls.js';

// Resize the renderers to fit with the current viewport.
export function resizeCanvasesEvent(mainRenderer, secondaryRenderer) {
	window.addEventListener('resize', () => {
		mainRenderer.setSize(window.innerWidth, window.innerHeight);
		secondaryRenderer.setSize(window.innerWidth / 4, window.innerHeight / 4);
	});
}

// Switch the camera into the next camera available
export function switchCameraEvent(cameras, controls, CameraIndex, objectList) {
	window.addEventListener('keypress', (event) => {
		// console.log(event);
		
		// If in fly mode, change the camera...
		if (controls.type === ControlTypes.FLY) {
			if (event.key === 'c' || event.key === 'C') {
				CameraIndex.active = (CameraIndex.active + 1) % (cameras.length-1);
				CameraIndex.next = (CameraIndex.active + 1) % (cameras.length-1);
			}
		}
		else if (controls.type === ControlTypes.ORBIT) {
			let orbitChanged = false;
			while (++controls.orbitIndex < objectList.length && !orbitChanged) {
				let j = 0;
				let isRejected = false;
				while (j < controls.orbitException.length && !isRejected) {
					if (objectList[i].name === controls.orbitException[j]) isRejected = true;
					else j++;
				}
				
				if (!isRejected) {
					orbitChanged = true;
					controls.active.target = objectList[i].scene.position;
				}
			}
			
			controls.orbitIndex %= objectList.length;
		}
	});
}

export function changeToFly(controls, cameras, CameraIndex, renderer, clock) {
	// Change the control into fly camera mode
	if(controls.active) controls.active.dispose(); // Remove all resources for the control
	
	controls.active = new FlyControls(cameras[CameraIndex.active], renderer.domElement);
	controls.active.movementSpeed = 2.5;
	controls.active.dragToLook = true;
	controls.active.rollSpeed = 0.4;
	controls.active.update(clock.getDelta());
	controls.type = ControlTypes.FLY;
	
	CameraIndex.active = CameraIndex.next-1;
}

export function changeToOrbit(controls, cameras, CameraIndex, renderer) {
	// Change the control into orbit camera mode
	if (controls.active) controls.active.dispose(); // Remove all resources for the control
	
	controls.active = new OrbitControls(cameras[CameraIndex.active], renderer.domElement);
	controls.active.enablePan = false;	// Disable to enable manual position override of camera
	controls.active.enableZoom = false; // Disable to enable manual position override of camera
	controls.active.rollSpeed = 0.4;
	controls.active.update();
	controls.type = ControlTypes.ORBIT;
	
	cameraIndex.active = cameras.length-1;
}

// Switch the view into the orbital camera targeting an object
// Use the ControlTypes Constants to compare the type of the control being used
export function switchControlEvent(controls, cameras, CameraIndex, renderer, clock) {
	window.addEventListener('keypress', (event) => {
		// console.log(event);
		if (event.key === 'v' || event.key === 'V') {
			if (controls.type === ControlTypes.FLY) {
				changeToOrbit(controls, cameras, CameraIndex, renderer);
			}
			else if (controls.type === ControlTypes.ORBIT) {
				changeToFly(controls, cameras, CameraIndex, renderer, clock);
			}
		}
	});
}