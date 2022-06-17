import { ControlTypes } from '/constants.js';

import {WebGLRenderer} from '/three/build/three.module.js';
import {FlyControls} from '/three/examples/jsm/controls/FlyControls.js';
import {OrbitControls} from '/three/examples/jsm/controls/OrbitControls.js';

// Resize the renderers to fit with the current viewport.
export function resizeCanvasesEvent(mainRenderer, secondaryRenderer) {
	window.addEventListener('resize', () => {
		mainRenderer.setSize(window.innerWidth, window.innerHeight);
		mainRenderer.setPixelRatio(window.innerWidth / window.innerHeight);
		secondaryRenderer.setSize(window.innerWidth / 4, window.innerHeight / 4);
	});
}

// Switch the camera into the next camera available
export function switchCameraEvent(cameras, controls, CameraIndex, objectList) {
	window.addEventListener('keypress', (event) => {
		// console.log(event);
		
		// If in fly mode, change the camera...
		if (event.key === 'c' || event.key === 'C') {
			if (controls.type === ControlTypes.FLY) {
				CameraIndex.active = (CameraIndex.active + 1) % (cameras.length-1);
				CameraIndex.next = (CameraIndex.active + 1) % (cameras.length-1);
				controls.active.object = cameras[CameraIndex.active];
			}
			else if (controls.type === ControlTypes.ORBIT) {
				let orbitChanged = false;
				while (controls.orbitIndex < objectList.length && !orbitChanged) {
					++controls.orbitIndex
					controls.orbitIndex %= objectList.length;
					
					// console.log('orbitIndex: ', controls.orbitIndex);
					
					let j = 0;
					let isRejected = false;
					while (j < controls.orbitException.length && !isRejected) {
						if (objectList[controls.orbitIndex].name === controls.orbitException[j]) isRejected = true;
						else j++;
					}
					
					if (!isRejected) {
						orbitChanged = true;
						
						orbitCameraPosition(cameras, CameraIndex, objectList, controls);
						
						// console.log('Cameras', cameras[CameraIndex.orbitIndex].position.z);
						// console.log('Object', objectList[controls.orbitIndex].scene.position.z);
						
						document.querySelector('#orbitText').innerText = `Target: ${objectList[controls.orbitIndex].name}`;
					}
				}
				
				controls.active.object = cameras[CameraIndex.active];
			}
		}
	});
}

// Sets the camera position whenever in orbit mode
export function orbitCameraPosition(cameras, CameraIndex, objectList, controls) {
	let objectX = objectList[controls.orbitIndex].scene.position.x - 15;
	let objectY = objectList[controls.orbitIndex].scene.position.y + 2;
	let objectZ = objectList[controls.orbitIndex].scene.position.z - 15;
	cameras[CameraIndex.orbitIndex].position.set(objectX, objectY, objectZ);
	
	controls.active.target = objectList[controls.orbitIndex].scene.position;
	controls.active.update();
}