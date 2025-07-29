import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Target, Zap, Clock, HelpCircle } from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import GameTimer from '@/components/GameTimer';
import StarRating from '@/components/StarRating';
import { Point, Line, Triangle, GameState } from '@/lib/gameTypes';
import { useProgress } from '@/hooks/useProgress';

const MedianGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { updateGameProgress } = useProgress();
  const [gameState, setGameState] = useState<GameState>({
    round: 0,
    score: 0,
    attempts: 2,
    totalRounds: 15,
    gameOver: true,
    lines: [],
    isProcessingClick: false,
    consecutiveCorrect: 0,
    showRightAngle: false,
    difficulty: 'medium',
    timeLimit: 30,
    timeRemaining: 30,
    timerActive: false,
    stars: 0,
  });
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'default' | 'success' | 'warning' | 'error' | 'perfect'>('default');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; type: string }>>([]);
  const [currentTriangle, setCurrentTriangle] = useState<Triangle | null>(null);
  const [showHint, setShowHint] = useState(false);

  const Point = (x: number, y: number): Point => ({ x, y });
  const Line = (p1: Point, p2: Point, isCorrect = false): Line => ({ 
    p1, p2, isCorrect, clicked: false, extension: undefined 
  });

  const generateTriangle = (): Triangle => {
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

  const calculateMedianLines = (triangle: Triangle): Line[] => {
    const { A, B, C } = triangle;
    const vertices = [A, B, C];
    const sides = [[B, C], [C, A], [A, B]];
    
    // Choose random vertex for the correct median
    const vertexIndex = Math.floor(Math.random() * 3);
    const fromVertex = vertices[vertexIndex];
    const oppositeSide = sides[vertexIndex];
    
    // Calculate midpoint of opposite side (correct median)
    const midpoint = Point(
      (oppositeSide[0].x + oppositeSide[1].x) / 2,
      (oppositeSide[0].y + oppositeSide[1].y) / 2
    );
    const correctMedian = Line(fromVertex, midpoint, true);
    
    // Calculate the length of the opposite side
    const sideLength = Math.sqrt(
      Math.pow(oppositeSide[1].x - oppositeSide[0].x, 2) + 
      Math.pow(oppositeSide[1].y - oppositeSide[0].y, 2)
    );
    
    const lines = [correctMedian];
    
    // Generate distractor lines with better spacing to avoid overlap
    const minSeparation = Math.max(30, sideLength * 0.15); // Minimum pixel separation
    const maxAttempts = 20;
    
    for (let i = 0; i < 2; i++) {
      let attempts = 0;
      let validPoint = false;
      let randomPoint: Point;
      
      while (!validPoint && attempts < maxAttempts) {
        // Generate random t value, avoiding the center (0.5) area
        let t: number;
        if (Math.random() < 0.5) {
          t = Math.random() * 0.35 + 0.05; // Left part: 0.05 to 0.4
        } else {
          t = Math.random() * 0.35 + 0.6;  // Right part: 0.6 to 0.95
        }
        
        randomPoint = Point(
          oppositeSide[0].x + t * (oppositeSide[1].x - oppositeSide[0].x),
          oppositeSide[0].y + t * (oppositeSide[1].y - oppositeSide[0].y)
        );
        
        // Check distance from midpoint and other distractors
        const distanceFromMidpoint = Math.sqrt(
          Math.pow(randomPoint.x - midpoint.x, 2) + 
          Math.pow(randomPoint.y - midpoint.y, 2)
        );
        
        if (distanceFromMidpoint >= minSeparation) {
          // Check distance from other distractor lines
          let tooClose = false;
          for (let j = 1; j < lines.length; j++) {
            const distanceFromOther = Math.sqrt(
              Math.pow(randomPoint.x - lines[j].p2.x, 2) + 
              Math.pow(randomPoint.y - lines[j].p2.y, 2)
            );
            if (distanceFromOther < minSeparation) {
              tooClose = true;
              break;
            }
          }
          
          if (!tooClose) {
            validPoint = true;
          }
        }
        
        attempts++;
      }
      
      if (validPoint) {
        lines.push(Line(fromVertex, randomPoint!, false));
      } else {
        // Fallback: use fixed positions if we can't find good random ones
        const fallbackT = i === 0 ? 0.25 : 0.75;
        const fallbackPoint = Point(
          oppositeSide[0].x + fallbackT * (oppositeSide[1].x - oppositeSide[0].x),
          oppositeSide[0].y + fallbackT * (oppositeSide[1].y - oppositeSide[0].y)
        );
        lines.push(Line(fromVertex, fallbackPoint, false));
      }
    }
    
    // Shuffle lines
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    
    return lines;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTriangle) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'hsl(210, 20%, 98%)');
    gradient.addColorStop(0.5, 'hsl(210, 15%, 95%)');
    gradient.addColorStop(1, 'hsl(210, 20%, 98%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.gameOver) return;

    const { A, B, C } = currentTriangle;

    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.closePath();
    
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

    // Draw hint measurement lines if enabled
    if (showHint && !gameState.gameOver) {
      const correctLine = gameState.lines.find(l => l.isCorrect);
      if (correctLine) {
        // Find which side the median is connected to
        const vertices = [A, B, C];
        const sides = [[B, C], [C, A], [A, B]];
        
        let targetSide: Point[] | null = null;
        for (let i = 0; i < vertices.length; i++) {
          const vertex = vertices[i];
          const dist = Math.sqrt(
            Math.pow(vertex.x - correctLine.p1.x, 2) + 
            Math.pow(vertex.y - correctLine.p1.y, 2)
          );
          if (dist < 5) { // If this vertex is the start of the median
            targetSide = sides[i];
            break;
          }
        }
        
        if (targetSide) {
          const [p1, p2] = targetSide;
          const midpoint = Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
          
          // Draw measurement marks
          const sideVector = { x: p2.x - p1.x, y: p2.y - p1.y };
          const sideLength = Math.sqrt(sideVector.x * sideVector.x + sideVector.y * sideVector.y);
          const perpVector = { x: -sideVector.y / sideLength, y: sideVector.x / sideLength };
          
          const markSize = 15;
          const markOffset = 20;
          
          // Quarter marks
          for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            const markPoint = Point(
              p1.x + t * sideVector.x,
              p1.y + t * sideVector.y
            );
            
            const markStart = Point(
              markPoint.x + perpVector.x * markOffset,
              markPoint.y + perpVector.y * markOffset
            );
            const markEnd = Point(
              markPoint.x + perpVector.x * (markOffset + markSize),
              markPoint.y + perpVector.y * (markOffset + markSize)
            );
            
            ctx.strokeStyle = i === 2 ? 'hsl(140, 90%, 45%)' : 'hsl(0, 0%, 50%)';
            ctx.lineWidth = i === 2 ? 3 : 2;
            ctx.setLineDash(i === 2 ? [] : [5, 3]);
            
            ctx.beginPath();
            ctx.moveTo(markStart.x, markStart.y);
            ctx.lineTo(markEnd.x, markEnd.y);
            ctx.stroke();
            
            // Draw measurement line to side
            ctx.beginPath();
            ctx.moveTo(markPoint.x, markPoint.y);
            ctx.lineTo(markStart.x, markStart.y);
            ctx.stroke();
          }
          
          ctx.setLineDash([]);
        }
      }
    }

    // Draw median lines
    const lineColors = ['hsl(200, 100%, 60%)', 'hsl(0, 100%, 65%)', 'hsl(140, 90%, 55%)'];
    gameState.lines.forEach((line, index) => {
      if (line.clicked) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
      } else {
        ctx.strokeStyle = lineColors[index % lineColors.length];
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
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

    // Mark midpoint for correct answer
    if (gameState.showRightAngle) {
      const correctLine = gameState.lines.find(l => l.isCorrect);
      if (correctLine) {
        ctx.beginPath();
        ctx.arc(correctLine.p2.x, correctLine.p2.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'hsl(140, 90%, 55%)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [gameState, currentTriangle, showHint]);

  useEffect(() => {
    draw();
  }, [draw]);

  const createParticles = (x: number, y: number, type: 'success' | 'perfect') => {
    const newParticles = Array.from({ length: type === 'perfect' ? 8 : 5 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      type
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  };

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      round: 0,
      score: 0,
      gameOver: false,
      consecutiveCorrect: 0,
      stars: 0
    }));
    setMessage('');
    setShowHint(false);
    nextRound();
  };

  const nextRound = () => {
    if (gameState.round >= gameState.totalRounds) {
      endGame();
      return;
    }

    const triangle = generateTriangle();
    const lines = calculateMedianLines(triangle);
    setCurrentTriangle(triangle);

    setGameState(prev => ({
      ...prev,
      round: prev.round + 1,
      attempts: 2,
      isProcessingClick: false,
      lines: lines,
      showRightAngle: false,
      timeRemaining: prev.timeLimit,
      timerActive: true
    }));

    setMessage('בחר את הקו שהוא התיכון במשולש (מקודקוד לאמצע הצלע מנוגדת)');
    setMessageType('default');
  };

  const endGame = () => {
    const stars = Math.min(3, Math.max(0, Math.floor((gameState.score / gameState.totalRounds) * 3)));
    setGameState(prev => ({ ...prev, gameOver: true, timerActive: false, stars }));
    
    // Save progress to localStorage
    updateGameProgress('median', {
      score: gameState.score,
      totalRounds: gameState.totalRounds,
      stars: stars
    });
    
    if (stars === 3) {
      setMessage(`🎉 מושלם! קיבלת ${gameState.score}/${gameState.totalRounds}! אתה מומחה תיכונים! 🎉`);
      setMessageType('perfect');
    } else if (stars === 2) {
      setMessage(`🌟 כל הכבוד! קיבלת ${gameState.score}/${gameState.totalRounds}! תוצאה מעולה! 🌟`);
      setMessageType('success');
    } else {
      setMessage(`המשחק נגמר! הניקוד שלך: ${gameState.score}/${gameState.totalRounds}. נסה שוב!`);
      setMessageType('default');
    }
  };

  const processGuess = (line: Line) => {
    setGameState(prev => ({ ...prev, isProcessingClick: true, timerActive: false }));

    if (line.isCorrect) {
      const newConsecutive = gameState.consecutiveCorrect + 1;
      const isPerfectStreak = newConsecutive >= 3;
      
      setMessage(isPerfectStreak ? '🔥 רצף מושלם! 🔥' : '🎯 נכון! זה התיכון! 🎯');
      setMessageType(isPerfectStreak ? 'perfect' : 'success');
      
      setGameState(prev => ({ 
        ...prev, 
        score: prev.score + 1, 
        consecutiveCorrect: newConsecutive,
        showRightAngle: true 
      }));
      
      createParticles(0, 0, isPerfectStreak ? 'perfect' : 'success');
      setTimeout(nextRound, 2000);
    } else {
      const newAttempts = gameState.attempts - 1;
      setGameState(prev => ({ ...prev, consecutiveCorrect: 0 }));
      
      if (newAttempts > 0) {
        setMessage('❌ לא נכון. התיכון מחבר קודקוד לאמצע הצלע מנוגדת!');
        setMessageType('warning');
        setGameState(prev => ({
          ...prev,
          attempts: newAttempts,
          isProcessingClick: false,
          lines: prev.lines.map(l => l === line ? { ...l, clicked: true } : l)
        }));
      } else {
        setMessage('💔 זו הייתה ההזדמנות האחרונה. הקו הנכון מסומן.');
        setMessageType('error');
        setGameState(prev => ({
          ...prev,
          attempts: 0,
          lines: prev.lines.map(l => l === line ? { ...l, clicked: true } : l),
          showRightAngle: true
        }));
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
      
      const A = line.p1;
      const B = line.p2;
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return;
      
      const t = Math.max(0, Math.min(1, ((clickPoint.x - A.x) * dx + (clickPoint.y - A.y) * dy) / (length * length)));
      const projection = Point(A.x + t * dx, A.y + t * dy);
      const distance = Math.sqrt(Math.pow(clickPoint.x - projection.x, 2) + Math.pow(clickPoint.y - projection.y, 2));
      
      if (distance < minDistance) {
        minDistance = distance;
        clickedLine = line;
      }
    });

    if (clickedLine) {
      processGuess(clickedLine);
    }
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

  const getMessageClasses = () => {
    const baseClasses = 'text-center font-bold text-2xl p-4 rounded-xl border-2';
    switch (messageType) {
      case 'success': return `${baseClasses} bg-green-50 text-green-700 border-green-300`;
      case 'warning': return `${baseClasses} bg-yellow-50 text-yellow-700 border-yellow-300`;
      case 'error': return `${baseClasses} bg-red-50 text-red-700 border-red-300`;
      case 'perfect': return `${baseClasses} bg-purple-50 text-purple-700 border-purple-300`;
      default: return `${baseClasses} bg-blue-50 text-blue-700 border-blue-300`;
    }
  };

  const getScoreIcon = () => {
    const percentage = (gameState.score / gameState.totalRounds) * 100;
    if (percentage >= 90) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (percentage >= 70) return <Star className="w-5 h-5 text-blue-500" />;
    return <Target className="w-5 h-5 text-green-500" />;
  };

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  return (
    <GameLayout 
      title="📏 תיכון במשולש" 
      description="מצא את הקו המחבר קודקוד לאמצע הצלע המנוגדת"
      showBackButton={true}
    >
      <div className="space-y-8">
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
              <StarRating stars={gameState.gameOver ? gameState.stars : Math.min(3, Math.floor((gameState.score / gameState.totalRounds) * 3))} />
            </div>
          </div>
        </div>

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
          {/* Hint Button */}
          {!gameState.gameOver && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                onClick={toggleHint}
                variant={showHint ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                {showHint ? 'הסתר רמז' : 'הצג רמז'}
              </Button>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            width={1058}
            height={500}
            className="game-canvas w-full transition-all duration-300"
            onClick={handleCanvasClick}
          />
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
                onClick={() => window.location.href = '/'}
                size="lg"
                variant="outline"
                className="transform hover:scale-105 transition-all duration-300"
              >
                <Target className="w-5 h-5 mr-2" />
                בית
              </Button>
              
              <Button 
                onClick={startGame}
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
                {gameState.round === 0 ? 'התחל משחק' : 'שחק שוב'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default MedianGame;