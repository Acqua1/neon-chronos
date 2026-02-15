
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { PoseFrame } from '../types';

interface VisualizerProps {
  poseHistory: PoseFrame[];
}

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], 
  [11, 23], [12, 24], [23, 24], 
  [23, 25], [25, 27], [24, 26], [26, 28], 
  [27, 29], [29, 31], [27, 31], 
  [28, 30], [30, 32], [28, 32], 
  [15, 17], [17, 19], [19, 21], [15, 21], 
  [16, 18], [18, 20], [20, 22], [16, 22], 
  [9, 10], 
];

const FACE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8]
];

const ALL_CONNECTIONS = [...POSE_CONNECTIONS, ...FACE_CONNECTIONS];
const TRAIL_COUNT = 15; 
const MAX_DELAY_MS = 2500;

const Visualizer: React.FC<VisualizerProps> = ({ poseHistory }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const poseHistoryRef = useRef<PoseFrame[]>([]);
  
  // 更新最新的历史记录引用，供动画循环使用
  useEffect(() => {
    poseHistoryRef.current = poseHistory;
  }, [poseHistory]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- Post Processing ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.8, // 强度
      0.5, // 半径
      0.1  // 阈值
    );
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Create Skeletons ---
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    const neonColors = [0x00ffff, 0xbf00ff, 0xff00ff];
    const skeletonMeshes: THREE.LineSegments[] = [];

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const material = new THREE.LineBasicMaterial({
        color: neonColors[i % neonColors.length],
        transparent: true,
        opacity: Math.pow(1.0 - (i / TRAIL_COUNT), 1.5), // 指数级淡出，更有层次感
        blending: THREE.AdditiveBlending
      });

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(ALL_CONNECTIONS.length * 2 * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const lineSegments = new THREE.LineSegments(geometry, material);
      skeletonMeshes.push(lineSegments);
      trailGroup.add(lineSegments);
    }

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const history = poseHistoryRef.current;
      if (history.length > 0) {
        const now = Date.now();
        
        skeletonMeshes.forEach((mesh, i) => {
          const targetDelay = (i / (TRAIL_COUNT - 1)) * MAX_DELAY_MS;
          const targetTimestamp = now - targetDelay;

          // 寻找最接近时间戳的帧
          let bestFrame = history[0];
          let minDiff = Math.abs(history[0].timestamp - targetTimestamp);

          for (let f = 1; f < history.length; f++) {
            const diff = Math.abs(history[f].timestamp - targetTimestamp);
            if (diff < minDiff) {
              minDiff = diff;
              bestFrame = history[f];
            } else if (diff > minDiff) {
              break; // 假设历史记录是按时间排序的
            }
          }

          const positions = mesh.geometry.attributes.position.array as Float32Array;
          if (bestFrame && bestFrame.landmarks && minDiff < 1000) { // 超过1秒的差异则隐藏
            let pIdx = 0;
            for (const [a, b] of ALL_CONNECTIONS) {
              const start = bestFrame.landmarks[a];
              const end = bestFrame.landmarks[b];

              if (start && end) {
                positions[pIdx++] = (1.0 - start.x - 0.5) * 15;
                positions[pIdx++] = (0.5 - start.y) * 15;
                positions[pIdx++] = -start.z * 10;

                positions[pIdx++] = (1.0 - end.x - 0.5) * 15;
                positions[pIdx++] = (0.5 - end.y) * 15;
                positions[pIdx++] = -end.z * 10;
              }
            }
            mesh.geometry.attributes.position.needsUpdate = true;
            mesh.visible = true;
          } else {
            mesh.visible = false;
          }
        });
      }

      composer.render();
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      skeletonMeshes.forEach(m => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []); // 空依赖数组，确保只初始化一次

  return <div ref={containerRef} className="w-full h-full" />;
};

export default Visualizer;
