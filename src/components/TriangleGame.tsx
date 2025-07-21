import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Target, Zap, Clock } from 'lucide-react';
import DifficultySelector from './DifficultySelector';
import GameTimer from './GameTimer';
import StarRating from './StarRating';

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
  const [gameState, setGameState] = useState<GameState>({
    round: 0,
    score: 0,
    attempts: 2,
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
    const padding = 80;
    const w = canvas.width;
    const h = canvas.height;
    let A: Point, B: Point, C: Point, area: number;
    
    do {
      A = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      B = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      C = Point(padding + Math.random() * (w - 2 * padding), padding + Math.random() * (h - 2 * padding));
      area = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2;
    } while (area < 15000);
    
    return { A, B, C };
  };

  const generateRightAngledTriangle = (): Triangle => {
    const canvas = canvasRef.current!;
    const padding = 80;
    const w = canvas.width;
    const h = canvas.height;
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
      const side_length_ac = 80 + Math.random() * 150;
      C = Point(A.x + side_length_ac * norm_perp.x, A.y + side_length_ac * norm_perp.y);

      isOutOfBounds = C.x < padding || C.x > w - padding || C.y < padding || C.y > h - padding;
      area = Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2;
      attempts++;
    } while ((area < 10000 || isOutOfBounds) && attempts < 50);
    
    if (isOutOfBounds || area < 10000) {
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
    const sideLength = Math.sqrt(lenSq);

    // Calculate Altitude
    const t_alt = lenSq === 0 ? 0 : ((fromVertex.x - p1.x) * dx + (fromVertex.y - p1.y) * dy) / lenSq;
    const foot_alt = Point(p1.x + t_alt * dx, p1.y + t_alt * dy);
    const altitude = Line(fromVertex, foot_alt, true);
    
    if (t_alt < 0) {
      altitude.extension = { from: p1, to: foot_alt };
    } else if (t_alt > 1) {
      altitude.extension = { from: p2, to: foot_alt };
    }

    const lines = [altitude];
    const t_values = [t_alt];

    // Calculate two distractor lines
    const h = dist(fromVertex, foot_alt);
    const min_pixel_sep = Math.max(25, h / 5.0);
    const min_t_sep = sideLength > 0 ? min_pixel_sep / sideLength : 0.1;

    for (let i = 0; i < 2; i++) {
      let t_new: number;
      let isSeparated: boolean;
      let attempts = 0;
      
      do {
        t_new = (Math.random() * 1.8) - 0.4;
        isSeparated = t_values.every(t => Math.abs(t_new - t) > min_t_sep);
        attempts++;
      } while (!isSeparated && attempts < 50);

      if (isSeparated) {
        t_values.push(t_new);
        const foot_new = Point(p1.x + t_new * dx, p1.y + t_new * dy);
        const distractor = Line(fromVertex, foot_new, false);

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

  const drawRightAngleIndicator = (ctx: CanvasRenderingContext2D, foot: Point, vertex: Point, side1: Point, side2: Point) => {
    if (!gameState.showRightAngle) return;

    const size = 20;
    const v1 = { x: side1.x - foot.x, y: side1.y - foot.y };
    const v2 = { x: side2.x - foot.x, y: side2.y - foot.y };
    
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (len1 === 0 || len2 === 0) return;
    
    const u1 = { x: v1.x / len1, y: v1.y / len1 };
    const u2 = { x: v2.x / len2, y: v2.y / len2 };
    
    const corner1 = { x: foot.x + u1.x * size, y: foot.y + u1.y * size };
    const corner2 = { x: foot.x + u2.x * size, y: foot.y + u2.y * size };
    const corner3 = { x: corner1.x + u2.x * size, y: corner1.y + u2.y * size };
    
    ctx.beginPath();
    ctx.moveTo(corner1.x, corner1.y);
    ctx.lineTo(corner3.x, corner3.y);
    ctx.lineTo(corner2.x, corner2.y);
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Fill the right angle square
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.fill();
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
    
    ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    ctx.lineWidth = 3;
    ctx.stroke();

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
      if (altitudeLine) {
        // Find the triangle sides that form the right angle
        const vertices = [A, B, C];
        const foot = altitudeLine.p2;
        const vertex = altitudeLine.p1;
        
        // Simple implementation - you can enhance this based on your triangle structure
        drawRightAngleIndicator(ctx, foot, vertex, A, B);
      }
    }
  }, [gameState]);

  useEffect(() => {
    draw();
  }, [draw]);

  const createParticles = (x: number, y: number, type: 'success' | 'perfect') => {
    const newParticles = Array.from({ length: type === 'perfect' ? 15 : 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * window.innerWidth, // Spread across full width
      y: Math.random() * window.innerHeight * 0.3, // Top third of screen
      type
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 3000);
  };

  const startGameWithDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    const timeLimit = difficulty === 'hard' ? 20 : difficulty === 'medium' ? 30 : 45;
    const totalRounds = difficulty === 'hard' ? 20 : 15;
    
    setGameState(prev => ({
      ...prev,
      round: 0,
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
    // Fix: Call nextRound to actually start the game
    setTimeout(() => nextRound(), 100);
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
        attempts: prev.difficulty === 'hard' ? 1 : 2,
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
      
      if (isPerfectStreak && isTimeBonus) {
        setMessage('🚀 מדהים! רצף מושלם עם בונוס זמן! 🚀');
        setMessageType('perfect');
      } else if (isPerfectStreak) {
        setMessage('🔥 רצף מושלם! אתה בלתי ניתן לעצירה! 🔥');
        setMessageType('perfect');
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
      createParticles(0, 0, isPerfectStreak ? 'perfect' : 'success');
      
      setTimeout(nextRound, 2000);
    } else {
      const newAttempts = gameState.attempts - 1;
      setGameState(prev => ({ ...prev, consecutiveCorrect: 0 }));
      
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
      {/* Star Confetti Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="fixed pointer-events-none text-4xl z-50 animate-confetti-fall"
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
            <canvas
              ref={canvasRef}
              width={1058}
              height={500}
              className="game-canvas w-full transition-all duration-300"
              onClick={handleCanvasClick}
            />
            
            {gameState.showRightAngle && (
              <div className="absolute top-4 right-4 bg-perfect/10 border border-perfect/30 rounded-lg px-3 py-2 animate-bounce-in">
                <div className="flex items-center gap-2 text-perfect font-medium">
                  <div className="w-4 h-4 border-2 border-perfect border-r-0 border-t-0"></div>
                  <span>זווית ישרה (90°)</span>
                </div>
              </div>
            )}
          </div>

          <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
            <div className={`text-4xl font-bold px-8 py-6 rounded-2xl shadow-2xl border-4 transition-all duration-500 ${getMessageClasses()}`}>
              {message}
            </div>
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
