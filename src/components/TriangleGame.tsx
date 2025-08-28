import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Target, Zap, Clock } from 'lucide-react';
import DifficultySelector from './DifficultySelector';
import GameTimer from './GameTimer';
import StarRating from './StarRating';
import { useProgress } from '@/hooks/useProgress';

interface Point {
  x: number;
  y: number;
}

interface Line {
  p1: Point;
  p2: Point;
  isAltitude: boolean;
  clicked: boolean;
  extension?: { from: Point; to: Point };
  actualFoot?: Point;
  t_parameter?: number;
  baseSide?: { p1: Point; p2: Point };
}

interface Triangle {
  A: Point;
  B: Point;
  C: Point;
}

interface GameState {
  round: number;
  score: number;
  attempts: number;
  totalRounds: number;
  gameOver: boolean;
  currentTriangle: Triangle | null;
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

const TriangleGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rightAngleRef = useRef<HTMLDivElement>(null);
  const { updateGameProgress } = useProgress();
  
  const [gameState, setGameState] = useState<GameState>({
    round: 0,
    score: 0,
    attempts: 0,
    totalRounds: 15,
    gameOver: true,
    currentTriangle: null,
    lines: [],
    isProcessingClick: false,
    consecutiveCorrect: 0,
    showRightAngle: false,
    difficulty: 'easy',
    timeLimit: 30,
    timeRemaining: 30,
    timerActive: false,
    stars: 0,
  });
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'default' | 'success' | 'warning' | 'error' | 'perfect'>('default');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; type: string }>>([]);
  const [showDifficultySelector, setShowDifficultySelector] = useState(true);
  const [showFallingStars, setShowFallingStars] = useState(false);
  const [fallingStars, setFallingStars] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);

  const Point = (x: number, y: number): Point => ({ x, y });
  const Line = (p1: Point, p2: Point, isAltitude = false): Line => ({ 
    p1, p2, isAltitude, clicked: false, extension: undefined 
  });

  const shuffleArray = <T,>(array: T[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  const generateObtuseOrAcuteTriangle = (): Triangle => {
    const canvas = canvasRef.current!;
    const padding = 250; // Increased padding to prevent any element from going outside canvas
    const w = canvas.width;
    const h = canvas.height;
    
    // Adjust minimum area based on difficulty - larger triangles for easier gameplay
    const minArea = gameState.difficulty === 'easy' ? 12000 : 
                   gameState.difficulty === 'medium' ? 9000 : 8000;
    
    let A: Point, B: Point, C: Point, area: number;
    
    do {
      A = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      B = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      C = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      area = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2;
      
      // For easy difficulty, ensure all altitudes fall inside triangle sides
      if (gameState.difficulty === 'easy') {
        const vertices = [A, B, C];
        const sides = [[B, C], [C, A], [A, B]];
        let allAltitudesInside = true;
        
        for (let i = 0; i < 3; i++) {
          const vertex = vertices[i];
          const [p1, p2] = sides[i];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const lenSq = dx * dx + dy * dy;
          const t = lenSq === 0 ? 0 : ((vertex.x - p1.x) * dx + (vertex.y - p1.y) * dy) / lenSq;
          
          if (t < 0.1 || t > 0.9) {
            allAltitudesInside = false;
            break;
          }
        }
        
        if (!allAltitudesInside) {
          area = 0; // Force regeneration
        }
      }
      
    } while (area < minArea);
    
    return { A, B, C };
  };

  const generateRightAngledTriangle = (): Triangle => {
    const canvas = canvasRef.current!;
    const padding = 250; // Increased padding to prevent any element from going outside canvas
    const w = canvas.width;
    const h = canvas.height;
    
    // Adjust minimum area based on difficulty
    const minArea = gameState.difficulty === 'easy' ? 9000 : 
                   gameState.difficulty === 'medium' ? 7000 : 6000;
    
    let A: Point, B: Point, C: Point, area: number, isOutOfBounds: boolean;
    let attempts = 0;
    
    do {
      A = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      B = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));

      const v_ab = { x: B.x - A.x, y: B.y - A.y };
      const v_perp = { x: -v_ab.y, y: v_ab.x };

      const len_perp = Math.sqrt(v_perp.x * v_perp.x + v_perp.y * v_perp.y);
      if (len_perp < 50) {
        area = 0;
        continue;
      }
      
      const norm_perp = { x: v_perp.x / len_perp, y: v_perp.y / len_perp };
      const side_length_ac = gameState.difficulty === 'easy' ? 100 + Math.random() * 140 : // Larger for easy mode
                         gameState.difficulty === 'medium' ? 80 + Math.random() * 120 :
                         70 + Math.random() * 100; // Smaller for hard mode
      C = Point(A.x + side_length_ac * norm_perp.x, A.y + side_length_ac * norm_perp.y);

      isOutOfBounds = C.x < padding || C.x > w - padding || C.y < padding || C.y > h - padding;
      area = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2;
      attempts++;
      
    } while ((area < minArea || isOutOfBounds) && attempts < 50);
    
    if (isOutOfBounds || area < minArea) {
      return generateObtuseOrAcuteTriangle();
    }
    return { A, B, C };
  };

  const generateTriangle = (): Triangle => {
    // Adjust complexity based on difficulty
    const complexityFactor = gameState.difficulty === 'hard' ? 0.5 : 
                           gameState.difficulty === 'medium' ? 0.4 : 0.33;
    
    if (Math.random() < complexityFactor) {
      return generateRightAngledTriangle();
    } else {
      return generateObtuseOrAcuteTriangle();
    }
  };

  const dist = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const calculateLines = (triangle: Triangle): Line[] => {
    const { A, B, C } = triangle;
    const vertices = [A, B, C];
    const sides = [[B, C], [C, A], [A, B]];
    
    const vertexIndex = Math.floor(Math.random() * 3);
    const fromVertex = vertices[vertexIndex];
    const side = sides[vertexIndex];
    const p1 = side[0];
    const p2 = side[1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) {
      // Degenerate case - regenerate triangle
      return [];
    }

    // Calculate the exact altitude foot using perpendicular projection
    const t_alt = ((fromVertex.x - p1.x) * dx + (fromVertex.y - p1.y) * dy) / lenSq;
    const foot_alt = Point(p1.x + t_alt * dx, p1.y + t_alt * dy);
    
    // Create the altitude line - always from vertex to the perpendicular foot
    const altitude = Line(fromVertex, foot_alt, true);
    altitude.actualFoot = foot_alt;
    altitude.t_parameter = t_alt;
    
    // Store which side is the base for highlighting
    altitude.baseSide = { p1, p2 };
    
    // Handle extensions for altitudes that fall outside the triangle edge
    if (t_alt < 0) {
      altitude.extension = { from: p1, to: foot_alt };
    } else if (t_alt > 1) {
      altitude.extension = { from: p2, to: foot_alt };
    }

    const lines = [altitude];
    const t_values = [t_alt];

    // Generate smarter distractor lines to avoid confusion
    const numDistractors = gameState.difficulty === 'hard' ? 3 : 2;
    const sideLength = Math.sqrt(lenSq);
    const min_separation = Math.max(40, sideLength * 0.2); // Minimum pixel separation

    for (let i = 0; i < numDistractors; i++) {
      let t_new: number;
      let isSeparated: boolean;
      let attempts = 0;
      
      do {
        // Generate distractor positions with better distribution
        // Limit extension to stay within canvas bounds
        const maxExtension = 0.8; // Reduced to keep within canvas
        if (gameState.difficulty === 'easy') {
          // Keep distractors closer to triangle for easier gameplay
          t_new = Math.random() * 1.2 - 0.1;
        } else if (gameState.difficulty === 'medium') {
          // Medium spread
          t_new = Math.random() * (1 + maxExtension) - maxExtension/2;
        } else {
          // Hard: still challenging but within bounds
          t_new = Math.random() * (1 + maxExtension * 2) - maxExtension;
        }
        
        // Check if the generated line point would be within canvas bounds
        const foot_test = Point(p1.x + t_new * dx, p1.y + t_new * dy);
        const canvas = canvasRef.current!;
        const isWithinBounds = foot_test.x >= 50 && foot_test.x <= canvas.width - 50 && 
                              foot_test.y >= 50 && foot_test.y <= canvas.height - 50;
        
        if (!isWithinBounds) {
          // Regenerate within bounds
          t_new = Math.max(0, Math.min(1, t_new)); // Clamp to triangle side
        }
        
        // Check separation in pixel space, not parameter space
        const foot_new = Point(p1.x + t_new * dx, p1.y + t_new * dy);
        isSeparated = t_values.every(t => {
          const existing_foot = Point(p1.x + t * dx, p1.y + t * dy);
          return dist(foot_new, existing_foot) > min_separation;
        });
        attempts++;
      } while (!isSeparated && attempts < 100);

      if (isSeparated) {
        t_values.push(t_new);
        const foot_new = Point(p1.x + t_new * dx, p1.y + t_new * dy);
        const distractor = Line(fromVertex, foot_new, false);
        distractor.t_parameter = t_new;

        // Add extensions for distractors outside triangle
        if (t_new < 0) {
          distractor.extension = { from: p1, to: foot_new };
        } else if (t_new > 1) {
          distractor.extension = { from: p2, to: foot_new };
        }
        
        lines.push(distractor);
      }
    }
    
    shuffleArray(lines);
    return lines;
  };

  const drawRightAngleIndicator = (ctx: CanvasRenderingContext2D, altitudeLine: Line, triangle: Triangle) => {
    if (!gameState.showRightAngle || !altitudeLine.actualFoot || !altitudeLine.baseSide) return;

    const foot = altitudeLine.actualFoot;
    const vertex = altitudeLine.p1;
    const { p1: baseP1, p2: baseP2 } = altitudeLine.baseSide;
    
    const size = 25;
    
    // Vector from altitude vertex to foot (altitude direction)
    const altVector = { x: foot.x - vertex.x, y: foot.y - vertex.y };
    const altLen = Math.sqrt(altVector.x * altVector.x + altVector.y * altVector.y);
    if (altLen === 0) return;
    const altUnit = { x: altVector.x / altLen, y: altVector.y / altLen };
    
    // Vector along the base side (base direction)
    const baseVector = { x: baseP2.x - baseP1.x, y: baseP2.y - baseP1.y };
    const baseLen = Math.sqrt(baseVector.x * baseVector.x + baseVector.y * baseVector.y);
    if (baseLen === 0) return;
    const baseUnit = { x: baseVector.x / baseLen, y: baseVector.y / baseLen };
    
    // Draw the right angle square at the foot
    const corner1 = { x: foot.x + baseUnit.x * size, y: foot.y + baseUnit.y * size };
    const corner2 = { x: foot.x + altUnit.x * size, y: foot.y + altUnit.y * size };
    const corner3 = { x: corner1.x + altUnit.x * size, y: corner1.y + altUnit.y * size };
    
    ctx.beginPath();
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(corner1.x, corner1.y);
    ctx.lineTo(corner3.x, corner3.y);
    ctx.lineTo(corner2.x, corner2.y);
    ctx.closePath();
    
    // Fill the right angle square with improved visibility
    ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.fill();
    
    // Outline the right angle square with stronger border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Add "90°" text near the right angle
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#8b5cf6';
    ctx.textAlign = 'center';
    const textX = foot.x + (baseUnit.x + altUnit.x) * size * 0.7;
    const textY = foot.y + (baseUnit.y + altUnit.y) * size * 0.7;
    ctx.fillText('90°', textX, textY);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create light gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'hsl(210, 20%, 98%)');
    gradient.addColorStop(0.5, 'hsl(210, 15%, 95%)');
    gradient.addColorStop(1, 'hsl(210, 20%, 98%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.gameOver || !gameState.currentTriangle) return;

    const { A, B, C } = gameState.currentTriangle;

    // Draw side extensions with enhanced styling
    gameState.lines.forEach(line => {
      if (line.extension) {
        ctx.beginPath();
        ctx.moveTo(line.extension.from.x, line.extension.from.y);
        ctx.lineTo(line.extension.to.x, line.extension.to.y);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);

    // Find the altitude line to highlight its base
    const altitudeLine = gameState.lines.find(l => l.isAltitude);
    
    // Draw triangle with enhanced styling
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.closePath();
    
    // Triangle fill with futuristic gradient
    const triangleGradient = ctx.createLinearGradient(
      Math.min(A.x, B.x, C.x), Math.min(A.y, B.y, C.y),
      Math.max(A.x, B.x, C.x), Math.max(A.y, B.y, C.y)
    );
    triangleGradient.addColorStop(0, 'rgba(0, 200, 255, 0.15)');
    triangleGradient.addColorStop(1, 'rgba(140, 69, 255, 0.1)');
    ctx.fillStyle = triangleGradient;
    ctx.fill();
    
    // Draw triangle outline
    ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Highlight the base side for the altitude
    if (altitudeLine && altitudeLine.baseSide) {
      const { p1: baseP1, p2: baseP2 } = altitudeLine.baseSide;
      ctx.beginPath();
      ctx.moveTo(baseP1.x, baseP1.y);
      ctx.lineTo(baseP2.x, baseP2.y);
      ctx.strokeStyle = '#f59e0b'; // Amber highlight
      ctx.lineWidth = 5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw lines with enhanced neon colors and effects
    const lineColors = ['hsl(200, 100%, 60%)', 'hsl(0, 100%, 65%)', 'hsl(140, 90%, 55%)', 'hsl(280, 100%, 70%)'];
    gameState.lines.forEach((line, index) => {
      if (line.clicked) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
      } else {
        ctx.strokeStyle = lineColors[index % lineColors.length];
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        // Add glow effect for unclicked lines
        ctx.shadowColor = lineColors[index % lineColors.length];
        ctx.shadowBlur = 8;
      }
      
      ctx.beginPath();
      ctx.moveTo(line.p1.x, line.p1.y);
      ctx.lineTo(line.p2.x, line.p2.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
    ctx.setLineDash([]);

    // Draw right angle indicator if needed
    if (gameState.showRightAngle) {
      const altitudeLine = gameState.lines.find(l => l.isAltitude);
      if (altitudeLine && gameState.currentTriangle) {
        drawRightAngleIndicator(ctx, altitudeLine, gameState.currentTriangle);
      }
    }
  }, [gameState]);

  useEffect(() => {
    draw();
  }, [draw]);

  const createParticles = (x: number, y: number, type: 'success' | 'perfect') => {
    const newParticles = Array.from({ length: type === 'perfect' ? 8 : 5 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * window.innerWidth, // Spread across full width
      y: Math.random() * window.innerHeight, // Spread across full height
      type
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  };

  const startGameWithDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    const timeLimit = difficulty === 'hard' ? 20 : difficulty === 'medium' ? 30 : 45;
    const totalRounds = difficulty === 'hard' ? 20 : 15;
    
    setGameState(prev => ({
      ...prev,
      round: 1, // Start directly at round 1
      score: 0,
      gameOver: false,
      consecutiveCorrect: 0,
      difficulty,
      timeLimit,
      timeRemaining: timeLimit,
      timerActive: false,
      totalRounds,
      stars: 0
    }));
    setShowDifficultySelector(false);
    setMessage('');
    // Start the first round immediately
    setTimeout(() => {
      const triangle = generateTriangle();
      const lines = calculateLines(triangle);
      
      setGameState(prev => ({
        ...prev,
        attempts: prev.difficulty === 'hard' ? 1 : 2,
        isProcessingClick: false,
        currentTriangle: triangle,
        lines: lines,
        showRightAngle: false,
        timeRemaining: prev.timeLimit,
        timerActive: true
      }));
      
      setMessage('בחר את הקו שהוא הגובה במשולש');
      setMessageType('default');
    }, 100);
  };

  const startGame = () => {
    setShowDifficultySelector(true);
  };

  const calculateStars = () => {
    const percentage = (gameState.score / gameState.totalRounds) * 100;
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= 50) return 1;
    return 0;
  };

  const nextRound = () => {
    setGameState(prev => {
      if (prev.round >= prev.totalRounds) {
        endGame();
        return prev;
      }

      const newRound = prev.round + 1;
      const triangle = generateTriangle();
      const lines = calculateLines(triangle);

      setMessage('בחר את הקו שהוא הגובה במשולש');
      setMessageType('default');

      return {
        ...prev,
        round: newRound,
        attempts: prev.difficulty === 'hard' ? 1 : 2, // Set proper attempts per round
        isProcessingClick: false,
        currentTriangle: triangle,
        lines: lines,
        showRightAngle: false,
        timeRemaining: prev.timeLimit,
        timerActive: true
      };
    });
  };

  const onTimeUp = () => {
    setGameState(prev => ({ ...prev, timerActive: false }));
    setMessage('⏰ נגמר הזמן! נמשיך לסיבוב הבא.');
    setMessageType('warning');
    setTimeout(nextRound, 2000);
  };

  const onTimerTick = () => {
    setGameState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
  };

  const endGame = () => {
    const stars = calculateStars();
    setGameState(prev => ({ ...prev, gameOver: true, timerActive: false, stars }));
    
    // Save progress to localStorage
    updateGameProgress('altitude', {
      score: gameState.score,
      totalRounds: gameState.totalRounds,
      stars: stars
    });
    
    // Show falling stars animation
    setShowFallingStars(true);
    const stars_array = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * window.innerWidth,
      delay: Math.random() * 2000
    }));
    setFallingStars(stars_array);
    
    // Remove falling stars after animation
    setTimeout(() => {
      setShowFallingStars(false);
      setFallingStars([]);
    }, 5000);
    
    const difficultyText = gameState.difficulty === 'hard' ? 'קשה' : 
                          gameState.difficulty === 'medium' ? 'בינוני' : 'קל';
    
    if (stars === 3) {
      setMessage(`🎉 מושלם! קיבלת ${gameState.score}/${gameState.totalRounds} ברמה ${difficultyText}! אתה אמן הגיאומטריה! 🎉`);
      setMessageType('perfect');
    } else if (stars === 2) {
      setMessage(`🌟 כל הכבוד! קיבלת ${gameState.score}/${gameState.totalRounds} ברמה ${difficultyText}! תוצאה מעולה! 🌟`);
      setMessageType('success');
    } else if (stars === 1) {
      setMessage(`👍 לא רע! קיבלת ${gameState.score}/${gameState.totalRounds} ברמה ${difficultyText}. אפשר לשפר!`);
      setMessageType('default');
    } else {
      setMessage(`המשחק נגמר! הניקוד שלך: ${gameState.score}/${gameState.totalRounds} ברמה ${difficultyText}. נסה שוב!`);
      setMessageType('default');
    }
  };

  const processGuess = (line: Line) => {
    setGameState(prev => ({ ...prev, isProcessingClick: true, timerActive: false }));

    if (line.isAltitude) {
      const newConsecutive = gameState.consecutiveCorrect + 1;
      const isPerfectStreak = newConsecutive >= 3;
      const isTimeBonus = gameState.timeRemaining > gameState.timeLimit * 0.8;
      const newCombo = combo + 1;
      
      // Update combo
      setCombo(newCombo);
      if (newCombo >= 3) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 2000);
      }
      
      // Enhanced messaging with combo system
      if (newCombo >= 5) {
        setMessage('🌟 קומבו אגדי! x5 אתה מאסטר! 🌟');
        setMessageType('perfect');
      } else if (isPerfectStreak && isTimeBonus) {
        setMessage(`🚀 מדהים! רצף מושלם עם בונוס זמן! Combo x${newCombo} 🚀`);
        setMessageType('perfect');
      } else if (isPerfectStreak) {
        setMessage(`🔥 רצף מושלם! Combo x${newCombo} אתה בלתי ניתן לעצירה! 🔥`);
        setMessageType('perfect');
      } else if (newCombo >= 3) {
        setMessage(`⚡ Combo x${newCombo}! תשובה מהירה ונכונה! ⚡`);
        setMessageType('success');
      } else if (isTimeBonus) {
        setMessage('⚡ מעולה! תשובה מהירה ונכונה! ⚡');
        setMessageType('success');
      } else {
        setMessage('🎯 כל הכבוד! תשובה נכונה! 🎯');
        setMessageType('success');
      }
      
      // Show right angle indicator
      setGameState(prev => ({ 
        ...prev, 
        score: prev.score + 1, 
        consecutiveCorrect: newConsecutive,
        showRightAngle: true 
      }));
      
      // Create particles spread across the screen instead of canvas center
      createParticles(0, 0, isPerfectStreak || newCombo >= 5 ? 'perfect' : 'success');
      
      setTimeout(nextRound, 2000);
    } else {
      const newAttempts = gameState.attempts - 1;
      setGameState(prev => ({ ...prev, consecutiveCorrect: 0 }));
      setCombo(0); // Reset combo on wrong answer
      setShowCombo(false);
      
      if (newAttempts > 0) {
        setMessage('❌ טעות... נסה שוב! יש לך עוד הזדמנות! ❌');
        setMessageType('warning');
        setGameState(prev => ({
          ...prev,
          attempts: newAttempts,
          isProcessingClick: false,
          lines: prev.lines.map(l => l === line ? { ...l, clicked: true } : l)
        }));
      } else {
        setMessage('💔 טעות. זו הייתה ההזדמנות האחרונה. הקו הנכון מודגש בירוק.');
        setMessageType('error');
        setGameState(prev => ({
          ...prev,
          attempts: 0,
          lines: prev.lines.map(l => l === line ? { ...l, clicked: true } : l),
          showRightAngle: true
        }));
        
        // Highlight correct answer
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const correctLine = gameState.lines.find(l => l.isAltitude);
          if (correctLine) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 5;
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(correctLine.p1.x, correctLine.p1.y);
            ctx.lineTo(correctLine.p2.x, correctLine.p2.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }, 100);
        
        setTimeout(nextRound, 3000);
      }
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.gameOver || gameState.isProcessingClick) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickPoint = Point(
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY
    );

    let clickedLine: Line | null = null;
    let minDistance = 25;

    gameState.lines.forEach(line => {
      if (line.clicked) return;

      const { p1, p2 } = line;
      const len_sq = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
      if (len_sq === 0) return;

      let t = ((clickPoint.x - p1.x) * (p2.x - p1.x) + (clickPoint.y - p1.y) * (p2.y - p1.y)) / len_sq;
      t = Math.max(0, Math.min(1, t));
      
      const projection = Point(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
      const distance = dist(clickPoint, projection);

      if (distance < minDistance) {
        minDistance = distance;
        clickedLine = line;
      }
    });

    if (clickedLine) {
      processGuess(clickedLine);
    }
  };

  const getMessageClasses = () => {
    switch (messageType) {
      case 'success':
        return 'success-message';
      case 'warning':
        return 'warning-message';
      case 'error':
        return 'error-message';
      case 'perfect':
        return 'perfect-message';
      default:
        return 'text-foreground';
    }
  };

  const getScoreIcon = () => {
    const percentage = (gameState.score / Math.max(gameState.round, 1)) * 100;
    if (percentage === 100) return <Trophy className="w-5 h-5 text-perfect" />;
    if (percentage >= 80) return <Star className="w-5 h-5 text-success" />;
    if (percentage >= 60) return <Target className="w-5 h-5 text-primary" />;
    return <Zap className="w-5 h-5 text-warning" />;
  };

  if (showDifficultySelector) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
        <DifficultySelector onSelectDifficulty={startGameWithDifficulty} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 relative">
      {/* Sparkling Star Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="fixed pointer-events-none text-4xl z-50 animate-confetti-sparkle"
          style={{ left: particle.x, top: particle.y }}
        >
          ⭐
        </div>
      ))}

      {/* Falling Stars at End Game */}
      {showFallingStars && fallingStars.map(star => (
        <div
          key={star.id}
          className="fixed pointer-events-none text-6xl z-50 animate-falling-stars"
          style={{ 
            left: star.x, 
            top: 0,
            animationDelay: `${star.delay}ms`
          }}
        >
          ⭐
        </div>
      ))}

      <Card className="shadow-game hover:shadow-glow transition-all duration-500 animate-fade-in">
        <CardHeader className="text-center rounded-t-xl">
          <CardTitle className="game-header text-3xl sm:text-4xl font-bold mb-3">
            🔺 משחק הגובה במשולש 🔺
          </CardTitle>
          <p className="text-muted-foreground text-lg font-medium">
            מצא את הקו שהוא הגובה במשולש • רמה: {gameState.difficulty === 'hard' ? 'קשה' : gameState.difficulty === 'medium' ? 'בינוני' : 'קל'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8 p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="score-card text-center transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">סיבוב</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {gameState.round}/{gameState.totalRounds}
              </div>
            </div>
            
            <div className="score-card text-center transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getScoreIcon()}
                <span className="text-sm font-medium text-muted-foreground">ניקוד</span>
              </div>
              <div className="text-2xl font-bold text-success">
                {gameState.score}
              </div>
            </div>
            
            <div className="score-card text-center transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-muted-foreground">רצף</span>
              </div>
              <div className="text-2xl font-bold text-warning">
                {gameState.consecutiveCorrect}
              </div>
            </div>

            <div className="score-card text-center transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-muted-foreground">כוכבים</span>
              </div>
              <div className="flex justify-center">
                <StarRating stars={gameState.gameOver ? gameState.stars : calculateStars()} />
              </div>
            </div>
          </div>

          {/* Timer */}
          {!gameState.gameOver && (
            <div className="flex justify-center">
              <GameTimer
                timeRemaining={gameState.timeRemaining}
                timeLimit={gameState.timeLimit}
                isActive={gameState.timerActive}
                onTimeUp={onTimeUp}
                onTick={onTimerTick}
              />
            </div>
          )}

          <div className="relative">
            <div className="text-center mb-6">
              <p className="text-xl font-semibold text-primary bg-primary/10 rounded-lg px-4 py-3 border border-primary/20">
                📐 סמן את הגובה במשולש הניצב לצלע המודגשת בכתום
              </p>
            </div>
            
            <canvas
              ref={canvasRef}
              width={1058}
              height={600}
              className="game-canvas w-full transition-all duration-300"
              onClick={handleCanvasClick}
            />
            
            {/* Combo Display */}
            {showCombo && combo >= 3 && (
              <div className={`absolute top-4 left-4 bg-gradient-to-r ${combo >= 5 ? 'from-purple-500/30 to-pink-500/30 border-purple-400' : 'from-yellow-400/20 to-orange-500/20 border-yellow-400'} border-2 rounded-xl px-4 py-3 shadow-lg animate-combo-appear`}>
                <div className={`flex items-center gap-3 font-bold ${combo >= 5 ? 'text-purple-200 animate-combo-fire' : 'text-yellow-600 animate-enhanced-pulse'}`}>
                  <div className="text-2xl">{combo >= 5 ? '⚡' : '🔥'}</div>
                  <div className="flex flex-col">
                    <span className="text-lg">{combo >= 5 ? 'LEGENDARY' : 'COMBO'}</span>
                    <span className="text-2xl">x{combo}</span>
                  </div>
                </div>
              </div>
            )}
            
            {gameState.showRightAngle && (
              <div className="absolute top-4 right-4 bg-perfect/10 border border-perfect/30 rounded-lg px-3 py-2 animate-bounce-in">
                <div className="flex items-center gap-2 text-perfect font-medium">
                  <div className="w-4 h-4 border-2 border-perfect border-r-0 border-t-0"></div>
                  <span>זווית ישרה (90°)</span>
                </div>
              </div>
            )}
          </div>

          <div className={`min-h-[3rem] text-lg font-medium flex items-center justify-center text-center px-4 py-2 rounded-lg transition-all duration-300 ${getMessageClasses()} mb-4`}>
            {message}
          </div>

          {gameState.gameOver && (
            <div className="text-center space-y-6 animate-scale-in">
              {gameState.stars > 0 && (
                <div className="flex flex-col items-center gap-4">
                  <h3 className="text-2xl font-bold">הישג מושג!</h3>
                  <StarRating stars={gameState.stars} size="lg" animated={true} showCount={true} />
                </div>
              )}
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={startGame}
                  size="lg"
                  className="game-button transform hover:scale-105 transition-all duration-300"
                >
                  <Target className="w-5 h-5 mr-2" />
                  שנה רמה
                </Button>
                
                <Button 
                  onClick={() => startGameWithDifficulty(gameState.difficulty)}
                  size="lg"
                  className={`${
                    gameState.stars === 3
                      ? 'game-button-perfect animate-rainbow' 
                      : gameState.stars >= 2
                      ? 'game-button-success' 
                      : 'game-button'
                  } transform hover:scale-105 transition-all duration-300`}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  שחק שוב
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TriangleGame;
