
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseFrame {
  timestamp: number;
  landmarks: Landmark[];
}

export interface ParticleConfig {
  count: number;
  neonColors: string[];
  delayMs: number;
}
