import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { PARAMS } from './parameters.js';

export class Simulation {
    constructor() {
        this.lettersData = [];
        this.physicsParticles = [];
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane();
        this.selectedGroup = null;
        this.dragOffset = new THREE.Vector3();
        
        this.initScene();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(PARAMS.colors.background);
        this.scene.fog = new THREE.FogExp2(PARAMS.colors.background, 0.02);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 8, 22);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; 
        
        const grid = new THREE.GridHelper(60, 60, PARAMS.colors.grid, 0xe0e0e0);
        grid.position.y = 0;
        this.scene.add(grid);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 15);
        this.scene.add(dirLight);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        this.setupInteractions();
        this.animate();
    }

    startSandboxMode() {
        PARAMS.word.forEach((char, index) => {
            const geo = this.createCleanGeometry(char);
            const group = this.createVisualGroup(geo);
            
            const offset = (index - (PARAMS.word.length - 1) / 2) * PARAMS.spacing;
            group.position.set(offset, 2, 0);
            
            group.userData = {
                isBroken: false,
                originalPos: new THREE.Vector3(offset, 2, 0),
                velocity: new THREE.Vector3(0,0,0),
                angularVelocity: new THREE.Vector3(0,0,0),
                clickCount: 0,
                lastClickTime: 0,
                flashTimer: 0 // Nuevo temporizador de impacto
            };
            
            this.scene.add(group);
            this.lettersData.push(group);
            
            gsap.from(group.position, { y: 15, duration: 1.5, ease: "bounce.out", delay: index * 0.1 });
        });
    }

    createCleanGeometry(char) {
        const shape = new THREE.Shape();
        if (char === 'M') {
            shape.moveTo(-1.6, -2); shape.lineTo(-1.6, 2); shape.lineTo(-0.6, 2);
            shape.lineTo(0, 0.5); shape.lineTo(0.6, 2); shape.lineTo(1.6, 2);
            shape.lineTo(1.6, -2); shape.lineTo(0.6, -2); shape.lineTo(0.6, 0.2);
            shape.lineTo(0, -1.2); shape.lineTo(-0.6, 0.2); shape.lineTo(-0.6, -2);
            shape.lineTo(-1.6, -2);
        } else if (char === 'A') {
            shape.moveTo(-1.5, -2); shape.lineTo(-0.3, 2); shape.lineTo(0.3, 2);
            shape.lineTo(1.5, -2); shape.lineTo(0.7, -2); shape.lineTo(0.4, -0.8);
            shape.lineTo(-0.4, -0.8); shape.lineTo(-0.7, -2); shape.lineTo(-1.5, -2);
        } else if (char === 'Y') {
            shape.moveTo(-1.6, 2); shape.lineTo(-0.6, 2); shape.lineTo(0, 0.2);
            shape.lineTo(0.6, 2); shape.lineTo(1.6, 2); shape.lineTo(0.4, -0.8);
            shape.lineTo(0.4, -2); shape.lineTo(-0.4, -2); shape.lineTo(-0.4, -0.8);
            shape.lineTo(-1.6, 2);
        }
        
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 });
        geo.center();
        return geo;
    }

    createVisualGroup(geometry) {
        const group = new THREE.Group();
        const meshMat = new THREE.MeshStandardMaterial({ 
            color: PARAMS.colors.palette[0], 
            roughness: 0.5, metalness: 0.2, 
            polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 
        });
        const mesh = new THREE.Mesh(geometry, meshMat);
        
        const edgesGeo = new THREE.EdgesGeometry(geometry);
        const linesMat = new THREE.LineBasicMaterial({ color: PARAMS.colors.edges, transparent: true, opacity: 0.5 });
        const lines = new THREE.LineSegments(edgesGeo, linesMat);
        
        const pointsMat = new THREE.PointsMaterial({ color: PARAMS.colors.vertices, size: 0.15 });
        const points = new THREE.Points(geometry, pointsMat);
        
        group.add(mesh); group.add(lines); group.add(points);
        return group;
    }

    setupInteractions() {
        window.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
    }

    onPointerDown(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        const meshes = this.lettersData.filter(g => !g.userData.isBroken).map(g => g.children[0]);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            this.controls.enabled = false;
            this.selectedGroup = intersects[0].object.parent;
            const data = this.selectedGroup.userData;
            
            const now = Date.now();
            if (now - data.lastClickTime < 600) {
                data.clickCount++;
            } else {
                data.clickCount = 1;
            }
            data.lastClickTime = now;
            
            if (data.clickCount >= 12) {
                this.shatterLetter(this.selectedGroup);
                this.selectedGroup = null;
                this.controls.enabled = true;
                return;
            }

            data.velocity.set(0,0,0);
            data.angularVelocity.set(0,0,0);
            
            this.dragPlane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()), intersects[0].point);
            this.raycaster.ray.intersectPlane(this.dragPlane, this.dragOffset);
            this.dragOffset.sub(this.selectedGroup.position);
        }
    }

    onPointerMove(event) {
        if (!this.selectedGroup) return;
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const point = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, point)) {
            const targetPos = point.sub(this.dragOffset);
            this.selectedGroup.userData.velocity.copy(targetPos).sub(this.selectedGroup.position).multiplyScalar(0.4);
            this.selectedGroup.position.copy(targetPos);
        }
    }

    onPointerUp() {
        if (this.selectedGroup) {
            this.selectedGroup.userData.angularVelocity.set(
                (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4
            );
        }
        this.selectedGroup = null;
        this.controls.enabled = true;
    }

    shatterLetter(group) {
        if (group.userData.isBroken) return;
        group.userData.isBroken = true;
        group.visible = false;
        group.userData.clickCount = 0; 
        group.userData.flashTimer = 0;
        
        const mat = new THREE.MeshBasicMaterial({ color: PARAMS.colors.vertices });
        const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        
        for (let i = 0; i < 25; i++) {
            const fragment = new THREE.Mesh(geo, mat);
            fragment.position.copy(group.position).add(new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2));
            fragment.userData.velocity = new THREE.Vector3((Math.random()-0.5)*0.8, Math.random()*0.8, (Math.random()-0.5)*0.8);
            this.scene.add(fragment);
            this.physicsParticles.push({ mesh: fragment, age: 0 });
        }

        setTimeout(() => {
            group.position.copy(group.userData.originalPos);
            group.rotation.set(0,0,0);
            group.scale.set(1,1,1);
            group.userData.velocity.set(0,0,0);
            group.userData.angularVelocity.set(0,0,0);
            group.userData.isBroken = false;
            group.visible = true;
            
            group.children[0].material.color.setHex(PARAMS.colors.palette[0]);
            
            gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 1.2, ease: "elastic.out(1, 0.4)" });
        }, 5000);
    }

    updateInflationColor(letter) {
        const data = letter.userData;
        const mesh = letter.children[0];
        
        // Base: Color según el inflado
        const ratio = Math.min(1, Math.max(0, data.clickCount / 11));
        const segment = ratio * (PARAMS.colors.palette.length - 1);
        const index = Math.floor(segment);
        const t = segment - index;

        const baseColor = new THREE.Color();
        if (index >= PARAMS.colors.palette.length - 1) {
            baseColor.setHex(PARAMS.colors.palette[PARAMS.colors.palette.length - 1]);
        } else {
            const colorA = new THREE.Color(PARAMS.colors.palette[index]);
            const colorB = new THREE.Color(PARAMS.colors.palette[index + 1]);
            baseColor.copy(colorA).lerp(colorB, t);
        }

        // Capa de impacto: Mezcla roja si hay colisión
        if (data.flashTimer > 0) {
            const flashColor = new THREE.Color(PARAMS.colors.impactFlash);
            mesh.material.color.copy(baseColor).lerp(flashColor, data.flashTimer);
            data.flashTimer -= 0.05; // Velocidad de desvanecimiento del rojo
            if (data.flashTimer < 0) data.flashTimer = 0;
        } else {
            mesh.material.color.copy(baseColor);
        }
    }

    updatePhysics() {
        const gravity = 0.02;
        const floorY = 1.0;

        for (let i = 0; i < this.lettersData.length; i++) {
            const letter = this.lettersData[i];
            const data = letter.userData;

            if (data.isBroken || letter === this.selectedGroup) {
                if (Date.now() - data.lastClickTime > 1500 && data.clickCount > 0) {
                    data.clickCount = Math.max(0, data.clickCount - 0.1); 
                }
                const scale = 1 + (data.clickCount * 0.15);
                letter.scale.set(scale, scale, scale);
                this.updateInflationColor(letter);
                continue;
            }

            data.velocity.y -= gravity;
            letter.position.add(data.velocity);
            letter.rotation.x += data.angularVelocity.x;
            letter.rotation.y += data.angularVelocity.y;
            letter.rotation.z += data.angularVelocity.z;

            data.velocity.x *= 0.98; data.velocity.z *= 0.98;
            data.angularVelocity.multiplyScalar(0.96);

            // Colisión con el Suelo
            if (letter.position.y < floorY) {
                letter.position.y = floorY;
                if (Math.abs(data.velocity.y) > 0.8) {
                    this.shatterLetter(letter); 
                } else {
                    // Activar destello de impacto si la caída es lo suficientemente fuerte
                    if (Math.abs(data.velocity.y) > 0.1) data.flashTimer = 1.0;
                    data.velocity.y *= -0.6; 
                    data.velocity.x *= 0.8; data.velocity.z *= 0.8;
                }
            }

            if (Date.now() - data.lastClickTime > 1500 && data.clickCount > 0) {
                data.clickCount = Math.max(0, data.clickCount - 0.1);
            }
            
            const currentScale = 1 + (data.clickCount * 0.15);
            letter.scale.set(currentScale, currentScale, currentScale);
            this.updateInflationColor(letter);

            // Colisiones entre letras
            for (let j = i + 1; j < this.lettersData.length; j++) {
                const other = this.lettersData[j];
                if (other.userData.isBroken) continue;
                
                const dist = letter.position.distanceTo(other.position);
                const minDistance = currentScale * 1.5 + (1 + other.userData.clickCount * 0.15) * 1.5;
                
                if (dist < minDistance) {
                    const normal = letter.position.clone().sub(other.position).normalize();
                    const overlap = minDistance - dist;

                    // Activar destello rojo en ambas letras al colisionar
                    if (overlap > 0.05) {
                        data.flashTimer = 1.0;
                        other.userData.flashTimer = 1.0;
                    }

                    letter.position.add(normal.clone().multiplyScalar(overlap * 0.5));
                    other.position.add(normal.clone().multiplyScalar(-overlap * 0.5));
                    
                    letter.userData.velocity.add(normal.clone().multiplyScalar(0.15));
                    other.userData.velocity.add(normal.clone().multiplyScalar(-0.15));
                    letter.userData.angularVelocity.add(new THREE.Vector3((Math.random()-0.5)*0.2, 0, (Math.random()-0.5)*0.2));
                }
            }
        }

        // Físicas de Fragmentos (Partículas naranjas)
        for (let i = this.physicsParticles.length - 1; i >= 0; i--) {
            const p = this.physicsParticles[i];
            p.age++;
            p.mesh.userData.velocity.y -= gravity * 0.6;
            p.mesh.position.add(p.mesh.userData.velocity);
            p.mesh.rotation.x += 0.1;
            p.mesh.rotation.y += 0.1;
            
            if (p.mesh.position.y < 0.15) {
                p.mesh.position.y = 0.15;
                p.mesh.userData.velocity.y *= -0.5;
                p.mesh.userData.velocity.x *= 0.8;
                p.mesh.userData.velocity.z *= 0.8;
            }
            
            if (p.age > 200) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.physicsParticles.splice(i, 1);
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        if (this.controls.enabled) this.controls.update();
        this.updatePhysics();
        this.renderer.render(this.scene, this.camera);
    }
}