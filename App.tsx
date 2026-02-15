
import React, { useState, useEffect, useRef } from 'react';
import * as mpPose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';
import Visualizer from './components/Visualizer';
import { PoseFrame } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [poseHistory, setPoseHistory] = useState<PoseFrame[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const historyRef = useRef<PoseFrame[]>([]);

  useEffect(() => {
    let camera: any = null;
    const PoseConstructor = (mpPose as any).Pose || (mpPose as any).default?.Pose || (window as any).Pose;

    if (!PoseConstructor) {
      setError("Failed to initialize Pose detection.");
      return;
    }

    const pose = new PoseConstructor({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1, // Increased for better stickman accuracy
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: any) => {
      if (results.poseLandmarks) {
        const newFrame: PoseFrame = {
          timestamp: Date.now(),
          landmarks: results.poseLandmarks,
        };
        historyRef.current.push(newFrame);
        
        // Keep enough history for a 3.5-second window (approx 100 frames at 30fps)
        if (historyRef.current.length > 200) {
          historyRef.current.shift();
        }

        // We update the state more frequently for smooth line movement
        setPoseHistory([...historyRef.current]);
      }
    });

    if (videoRef.current) {
      const CameraConstructor = (cam as any).Camera || (cam as any).default?.Camera || (window as any).Camera;
      if (CameraConstructor) {
        camera = new CameraConstructor(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) await pose.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        camera.start().then(() => setIsLoaded(true)).catch(() => setError("Camera access denied."));
      }
    }

    return () => {
      if (camera) camera.stop();
      pose.close();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted />
      <Visualizer poseHistory={poseHistory} />

      <div className="absolute top-0 left-0 p-8 pointer-events-none z-10 w-full flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-pulse">
            NEON CHRONOS
          </h1>
          <p className="text-xs font-mono text-cyan-300 opacity-70 uppercase tracking-widest">
            Skeletal Flow Field // Time Trail Active
          </p>
        </div>

        <div className="text-right">
          {!isLoaded && !error && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              <span className="text-xs font-mono text-cyan-400 uppercase">Detecting Form...</span>
            </div>
          )}
          {error && <span className="text-xs font-mono text-red-500 uppercase">{error}</span>}
          {isLoaded && (
            <div className="flex flex-col items-end space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-1 border border-cyan-500/30 rounded uppercase">
                Mode: Kinetic Line
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/30 px-2 py-1 border border-purple-500/30 rounded uppercase">
                Trail: 3.0s Delay
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-40">
        <p className="text-[10px] font-mono text-white uppercase tracking-widest">
          Movement is an echo in time
        </p>
      </div>
    </div>
  );
};

export default App;
