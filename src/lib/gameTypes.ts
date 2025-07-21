export interface Point {
  x: number;
  y: number;
}

export interface Line {
  p1: Point;
  p2: Point;
  isCorrect: boolean;
  clicked: boolean;
  extension?: { from: Point; to: Point };
}

export interface Triangle {
  A: Point;
  B: Point;
  C: Point;
}

export interface Quadrilateral {
  A: Point;
  B: Point;
  C: Point;
  D: Point;
}

export interface Circle {
  center: Point;
  radius: number;
}

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'triangle' | 'quadrilateral' | 'circle';
  unlocked: boolean;
  bestScore: number;
  stars: number;
}

export interface GameState {
  round: number;
  score: number;
  attempts: number;
  totalRounds: number;
  gameOver: boolean;
  lines: Line[];
  isProcessingClick: boolean;
  consecutiveCorrect: number;
  showRightAngle: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  timeRemaining: number;
  timerActive: boolean;
  stars: number;
}

export type GameType = 
  | 'altitude' 
  | 'median' 
  | 'angle-bisector' 
  | 'diagonal' 
  | 'circle-center';

export interface ProgressData {
  totalGamesCompleted: number;
  totalStars: number;
  averageScore: number;
  gameProgress: Record<GameType, {
    completed: boolean;
    bestScore: number;
    stars: number;
    attempts: number;
  }>;
}