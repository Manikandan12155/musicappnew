import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { audioEngine } from '../services/audioEngine';

interface AnimeCharacter3DProps {
  isPlaying: boolean;
  coverUrl?: string;
}

export const AnimeCharacter3D: React.FC<AnimeCharacter3DProps> = ({ isPlaying }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 320;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 3.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // 2. Lighting Setup (Cyberpunk Neon Studio)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);

    // Vibrant Neon Green Rim Light
    const rimLight = new THREE.PointLight(0x39FF14, 2.5, 8);
    rimLight.position.set(-2, 1.5, -1);
    scene.add(rimLight);

    // Emerald Fill Light
    const fillLight = new THREE.PointLight(0x10b981, 1.8, 8);
    fillLight.position.set(2, -1, 1);
    scene.add(fillLight);

    // 3. Stylized 3D Anime Character Hierarchy
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Materials
    const skinMat = new THREE.MeshToonMaterial({ color: 0xffe0bd });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x1a2621 });
    const hairHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x39FF14,
      emissive: 0x1db954,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x0f1311, roughness: 0.35, metalness: 0.2 });
    const neonGreenMat = new THREE.MeshStandardMaterial({
      color: 0x39FF14,
      emissive: 0x39FF14,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeIrisMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x39FF14,
      emissiveIntensity: 0.8
    });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x051a0e });

    // --- Torso / Hoodie ---
    const torsoGroup = new THREE.Group();
    characterGroup.add(torsoGroup);

    const torsoGeo = new THREE.CylinderGeometry(0.48, 0.42, 0.85, 16);
    const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
    torsoMesh.position.y = -0.55;
    torsoGroup.add(torsoMesh);

    // Hoodie Neon Zipper Strip
    const zipperGeo = new THREE.BoxGeometry(0.04, 0.85, 0.04);
    const zipperMesh = new THREE.Mesh(zipperGeo, neonGreenMat);
    zipperMesh.position.set(0, -0.55, 0.47);
    torsoGroup.add(zipperMesh);

    // Hoodie Collar
    const collarGeo = new THREE.TorusGeometry(0.38, 0.12, 12, 24);
    const collarMesh = new THREE.Mesh(collarGeo, jacketMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.set(0, -0.15, 0);
    torsoGroup.add(collarMesh);

    // Shoulders & Arms
    const shoulderGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const leftShoulder = new THREE.Mesh(shoulderGeo, jacketMat);
    leftShoulder.position.set(-0.55, -0.28, 0);
    torsoGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, jacketMat);
    rightShoulder.position.set(0.55, -0.28, 0);
    torsoGroup.add(rightShoulder);

    const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.65, 12);
    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.position.set(-0.62, -0.62, 0);
    leftArm.rotation.z = 0.22;
    torsoGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.position.set(0.62, -0.62, 0);
    rightArm.rotation.z = -0.22;
    torsoGroup.add(rightArm);

    // --- Neck ---
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.35, 16);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, -0.05, 0);
    characterGroup.add(neckMesh);

    // --- Head Group ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.38, 0);
    characterGroup.add(headGroup);

    // Anime Head Sphere with chin tapered
    const headGeo = new THREE.SphereGeometry(0.55, 24, 24);
    headGeo.scale(0.92, 1.05, 0.95);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Anime Chin / Jaw
    const chinGeo = new THREE.ConeGeometry(0.26, 0.3, 16);
    chinGeo.scale(1, 1, 0.7);
    const chinMesh = new THREE.Mesh(chinGeo, skinMat);
    chinMesh.position.set(0, -0.44, 0.15);
    chinMesh.rotation.x = Math.PI;
    headGroup.add(chinMesh);

    // Blushing anime cheeks
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0.5 });
    const blushGeo = new THREE.CircleGeometry(0.09, 16);

    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.28, -0.08, 0.48);
    leftBlush.rotation.y = -0.3;
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.28, -0.08, 0.48);
    rightBlush.rotation.y = 0.3;
    headGroup.add(rightBlush);

    // --- Expressive Anime Eyes ---
    const eyeGroup = new THREE.Group();
    headGroup.add(eyeGroup);

    const createEye = (x: number) => {
      const singleEye = new THREE.Group();
      singleEye.position.set(x, 0.02, 0.46);
      singleEye.rotation.y = x > 0 ? 0.25 : -0.25;

      // White Sclera
      const scleraGeo = new THREE.SphereGeometry(0.14, 16, 16);
      scleraGeo.scale(1, 1.35, 0.35);
      const scleraMesh = new THREE.Mesh(scleraGeo, whiteMat);
      singleEye.add(scleraMesh);

      // Glowing Emerald Iris
      const irisGeo = new THREE.SphereGeometry(0.095, 16, 16);
      irisGeo.scale(0.9, 1.15, 0.38);
      const irisMesh = new THREE.Mesh(irisGeo, eyeIrisMat);
      irisMesh.position.z = 0.05;
      singleEye.add(irisMesh);

      // Deep Pupil
      const pupilGeo = new THREE.SphereGeometry(0.045, 12, 12);
      pupilGeo.scale(0.8, 1.0, 0.4);
      const pupilMesh = new THREE.Mesh(pupilGeo, eyePupilMat);
      pupilMesh.position.z = 0.08;
      singleEye.add(pupilMesh);

      // Anime Eye Glint Highlights
      const glintGeo1 = new THREE.SphereGeometry(0.024, 8, 8);
      const glintMesh1 = new THREE.Mesh(glintGeo1, whiteMat);
      glintMesh1.position.set(0.025, 0.035, 0.1);
      singleEye.add(glintMesh1);

      const glintGeo2 = new THREE.SphereGeometry(0.014, 8, 8);
      const glintMesh2 = new THREE.Mesh(glintGeo2, whiteMat);
      glintMesh2.position.set(-0.025, -0.035, 0.1);
      singleEye.add(glintMesh2);

      return singleEye;
    };

    const leftEye = createEye(-0.21);
    const rightEye = createEye(0.21);
    eyeGroup.add(leftEye);
    eyeGroup.add(rightEye);

    // Eyelash Liners
    const lashMat = new THREE.MeshBasicMaterial({ color: 0x111613 });
    const lashGeo = new THREE.TorusGeometry(0.13, 0.022, 8, 16, Math.PI * 0.7);
    const leftLash = new THREE.Mesh(lashGeo, lashMat);
    leftLash.position.set(-0.21, 0.15, 0.48);
    leftLash.rotation.set(-0.2, 0.2, -0.15);
    headGroup.add(leftLash);

    const rightLash = new THREE.Mesh(lashGeo, lashMat);
    rightLash.position.set(0.21, 0.15, 0.48);
    rightLash.rotation.set(-0.2, -0.2, 0.15);
    headGroup.add(rightLash);

    // --- Anime Spiky / Flowing Hair ---
    const hairGroup = new THREE.Group();
    headGroup.add(hairGroup);

    // Hair Cap / Base
    const hairCapGeo = new THREE.SphereGeometry(0.58, 20, 20);
    hairCapGeo.scale(1.02, 1.08, 1.05);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 0.08, -0.06);
    hairGroup.add(hairCap);

    // Front Bangs / Locks
    const createBang = (x: number, y: number, z: number, rx: number, ry: number, rz: number, s: number, isHighlight = false) => {
      const bangGeo = new THREE.ConeGeometry(0.11 * s, 0.48 * s, 8);
      bangGeo.scale(1.2, 1, 0.5);
      const bangMesh = new THREE.Mesh(bangGeo, isHighlight ? hairHighlightMat : hairMat);
      bangMesh.position.set(x, y, z);
      bangMesh.rotation.set(rx, ry, rz);
      return bangMesh;
    };

    hairGroup.add(createBang(-0.28, 0.24, 0.46, -0.3, 0.4, 0.35, 1.1));
    hairGroup.add(createBang(-0.14, 0.28, 0.51, -0.4, 0.1, 0.15, 1.25));
    hairGroup.add(createBang(0.04, 0.29, 0.52, -0.4, -0.1, -0.1, 1.3, true)); // Neon Green highlighted bang!
    hairGroup.add(createBang(0.22, 0.26, 0.48, -0.3, -0.3, -0.3, 1.15));
    hairGroup.add(createBang(0.35, 0.20, 0.42, -0.2, -0.5, -0.45, 1.0));

    // Side Locks
    const createSideLock = (x: number, isLeft: boolean) => {
      const lockGeo = new THREE.CylinderGeometry(0.09, 0.03, 0.75, 8);
      const lock = new THREE.Mesh(lockGeo, hairMat);
      lock.position.set(x, -0.15, 0.22);
      lock.rotation.z = isLeft ? 0.2 : -0.2;
      return lock;
    };
    hairGroup.add(createSideLock(-0.46, true));
    hairGroup.add(createSideLock(0.46, false));

    // --- Cyberpunk DJ Cat-Ear Headphones ---
    const headphoneGroup = new THREE.Group();
    headGroup.add(headphoneGroup);

    // Headband
    const bandGeo = new THREE.TorusGeometry(0.62, 0.05, 12, 32, Math.PI);
    const bandMesh = new THREE.Mesh(bandGeo, jacketMat);
    bandMesh.position.set(0, 0.08, 0);
    headphoneGroup.add(bandMesh);

    // Earcups with glowing neon rings
    const createEarCup = (x: number, isLeft: boolean) => {
      const cupGroup = new THREE.Group();
      cupGroup.position.set(x, 0.05, 0);
      cupGroup.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;

      const outerGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.16, 20);
      const outerMesh = new THREE.Mesh(outerGeo, jacketMat);
      outerMesh.rotation.x = Math.PI / 2;
      cupGroup.add(outerMesh);

      const neonRingGeo = new THREE.TorusGeometry(0.18, 0.035, 12, 24);
      const neonRingMesh = new THREE.Mesh(neonRingGeo, neonGreenMat);
      neonRingMesh.position.z = 0.09;
      cupGroup.add(neonRingMesh);

      // Inner Cushion
      const cushionGeo = new THREE.TorusGeometry(0.15, 0.06, 12, 24);
      const cushionMesh = new THREE.Mesh(cushionGeo, jacketMat);
      cushionMesh.position.z = -0.06;
      cupGroup.add(cushionMesh);

      return cupGroup;
    };

    const leftCup = createEarCup(-0.62, true);
    const rightCup = createEarCup(0.62, false);
    headphoneGroup.add(leftCup);
    headphoneGroup.add(rightCup);

    // Cyber Cat Ears with Neon Strips
    const createCatEar = (x: number, isLeft: boolean) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(x, 0.65, 0);
      earGroup.rotation.z = isLeft ? 0.35 : -0.35;

      const earGeo = new THREE.ConeGeometry(0.16, 0.32, 4);
      earGeo.scale(1, 1, 0.55);
      const earMesh = new THREE.Mesh(earGeo, jacketMat);
      earMesh.rotation.y = Math.PI / 4;
      earGroup.add(earMesh);

      const earNeonGeo = new THREE.ConeGeometry(0.09, 0.22, 4);
      earNeonGeo.scale(1, 1, 0.55);
      const earNeonMesh = new THREE.Mesh(earNeonGeo, neonGreenMat);
      earNeonMesh.position.set(0, 0.02, 0.02);
      earNeonMesh.rotation.y = Math.PI / 4;
      earGroup.add(earNeonMesh);

      return earGroup;
    };

    headphoneGroup.add(createCatEar(-0.35, true));
    headphoneGroup.add(createCatEar(0.35, false));

    // --- Floating Holographic Audio Particles ---
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 1.2 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.4) * 2.2;
      posArray[i] = Math.cos(theta) * radius;
      posArray[i + 1] = y;
      posArray[i + 2] = Math.sin(theta) * radius;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x39FF14,
      size: 0.065,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- 4. Interactive 3D Drag / Orbit Controls ---
    let isDragging = false;
    let prevMouseX = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      prevMouseX = clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - prevMouseX;
      prevMouseX = clientX;
      targetRotationY += deltaX * 0.014;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // --- 5. Animation Loop with Real-Time Beat Reactivity ---
    let animId: number;
    let clock = new THREE.Clock();
    let nextBlinkTime = 2.5;
    let isBlinking = false;
    let blinkTimer = 0;

    const animate = () => {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Audio Frequency Metrics
      const metrics = audioEngine.getAudioMetrics();
      const bass = metrics.bass || 0;
      const energy = metrics.energy || 0;

      // Smooth Character Orbit
      characterGroup.rotation.y += (targetRotationY - characterGroup.rotation.y) * 0.1;
      characterGroup.rotation.x += (targetRotationX - characterGroup.rotation.x) * 0.1;

      // Natural continuous slow turntable vibe
      if (!isDragging) {
        targetRotationY += 0.003;
      }

      // --- Beat-Reactive Dance & Groove ---
      if (isPlaying) {
        // Head Bobbing & Swaying to the beat
        const tempo = 8.5; // Natural groovy bounce
        const beatBounce = Math.sin(elapsed * tempo) * (0.04 + bass * 0.08);
        const headNod = Math.cos(elapsed * tempo) * (0.08 + bass * 0.14);
        const headTilt = Math.sin(elapsed * (tempo * 0.5)) * 0.06;

        headGroup.position.y = 0.38 + beatBounce;
        headGroup.rotation.x = headNod;
        headGroup.rotation.z = headTilt;

        // Torso Subtle Sway
        torsoGroup.position.y = beatBounce * 0.5;
        torsoGroup.rotation.z = -headTilt * 0.35;

        // Arm Groove
        leftArm.rotation.z = 0.22 + Math.sin(elapsed * tempo) * (0.05 + bass * 0.1);
        rightArm.rotation.z = -0.22 - Math.sin(elapsed * tempo) * (0.05 + bass * 0.1);

        // Headphone Neon Intensity Pulse
        neonGreenMat.emissiveIntensity = 1.0 + bass * 2.2 + energy * 0.8;
        rimLight.intensity = 2.0 + bass * 3.5;
      } else {
        // Gentle breathing idle animation
        const breath = Math.sin(elapsed * 1.8) * 0.015;
        headGroup.position.y = 0.38 + breath;
        headGroup.rotation.x = Math.sin(elapsed * 0.9) * 0.02;
        headGroup.rotation.z = 0;
        torsoGroup.position.y = breath * 0.4;
        torsoGroup.rotation.z = 0;
        neonGreenMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 2.0) * 0.25;
        rimLight.intensity = 1.8;
      }

      // --- Anime Natural Blinking System ---
      if (elapsed > nextBlinkTime) {
        isBlinking = true;
        blinkTimer = 0;
        nextBlinkTime = elapsed + 2.5 + Math.random() * 3.5;
      }

      if (isBlinking) {
        blinkTimer += dt;
        const blinkProgress = blinkTimer / 0.16; // 160ms blink duration
        if (blinkProgress <= 0.5) {
          eyeGroup.scale.y = Math.max(0.08, 1 - blinkProgress * 2);
        } else if (blinkProgress <= 1.0) {
          eyeGroup.scale.y = Math.min(1.0, (blinkProgress - 0.5) * 2);
        } else {
          eyeGroup.scale.y = 1;
          isBlinking = false;
        }
      }

      // Orbiting particles
      particles.rotation.y = elapsed * 0.15;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [isPlaying]);

  return (
    <div className="anime-character-3d-box">
      <div ref={mountRef} className="anime-canvas-mount" />
      <div className="character-drag-hint">
        <span className="drag-hint-icon">✥</span>
        <span>Drag to rotate in 3D</span>
      </div>
    </div>
  );
};
