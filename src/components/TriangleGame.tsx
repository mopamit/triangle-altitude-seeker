import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

const TriangleGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    round: 0,
    score: 0,
    attempts: 2,
    totalRounds: 15,
    gameOver: true,
    currentTriangle: null,
    lines: [],
    isProcessingClick: false,
  });
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'default' | 'success' | 'warning' | 'error'>('default');

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
    if (Math.random() < 0.33) {
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.gameOver || !gameState.currentTriangle) return;

    const { A, B, C } = gameState.currentTriangle;

    // Draw side extensions
    gameState.lines.forEach(line => {
      if (line.extension) {
        ctx.beginPath();
        ctx.moveTo(line.extension.from.x, line.extension.from.y);
        ctx.lineTo(line.extension.to.x, line.extension.to.y);
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);

    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.closePath();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw lines
    const lineColors = ['#3b82f6', '#ef4444', '#10b981'];
    gameState.lines.forEach((line, index) => {
      if (line.clicked) {
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
      } else {
        ctx.strokeStyle = lineColors[index % lineColors.length];
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(line.p1.x, line.p1.y);
      ctx.lineTo(line.p2.x, line.p2.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }, [gameState]);

  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      round: 0,
      score: 0,
      gameOver: false
    }));
    setMessage('');
    nextRound();
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

      setMessage('בחר את הקו שהוא הגובה');
      setMessageType('default');

      return {
        ...prev,
        round: newRound,
        attempts: 2,
        isProcessingClick: false,
        currentTriangle: triangle,
        lines: lines
      };
    });
  };

  const endGame = () => {
    setGameState(prev => ({ ...prev, gameOver: true }));
    setMessage(`המשחק נגמר! הניקוד הסופי שלך הוא ${gameState.score} מתוך ${gameState.totalRounds}.`);
    setMessageType('default');
  };

  const processGuess = (line: Line) => {
    setGameState(prev => ({ ...prev, isProcessingClick: true }));

    if (line.isAltitude) {
      setMessage('כל הכבוד! תשובה נכונה!');
      setMessageType('success');
      setGameState(prev => ({ ...prev, score: prev.score + 1 }));
      setTimeout(nextRound, 1500);
    } else {
      const newAttempts = gameState.attempts - 1;
      
      if (newAttempts > 0) {
        setMessage('טעות... נסה שוב!');
        setMessageType('warning');
        setGameState(prev => ({
          ...prev,
          attempts: newAttempts,
          isProcessingClick: false,
          lines: prev.lines.map(l => l === line ? { ...l, clicked: true } : l)
        }));
      } else {
        setMessage('טעות. זו הייתה ההזדמנות האחרונה.');
        setMessageType('error');
        setGameState(prev => ({
          ...prev,
          attempts: 0,
          lines: prev.lines.map(l => l === line ? { ...l, clicked: true } : l)
        }));
        
        // Highlight correct answer
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const correctLine = gameState.lines.find(l => l.isAltitude);
          if (correctLine) {
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(correctLine.p1.x, correctLine.p1.y);
            ctx.lineTo(correctLine.p2.x, correctLine.p2.y);
            ctx.stroke();
          }
        }, 100);
        
        setTimeout(nextRound, 2500);
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
    let minDistance = 20;

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
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <Card className="shadow-game">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">
            משחק הגובה במשולש
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            מצא את הקו שהוא הגובה במשולש. יש לך שתי הזדמנויות בכל סיבוב.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="score-card">
              <div className="text-lg font-semibold">
                סיבוב: {gameState.round}/{gameState.totalRounds}
              </div>
            </div>
            <div className="score-card">
              <div className="text-lg font-semibold">
                ניקוד: {gameState.score}
              </div>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="game-canvas w-full"
            onClick={handleCanvasClick}
          />

          <div className={`h-10 text-xl font-medium flex items-center justify-center ${getMessageClasses()}`}>
            {message}
          </div>

          {gameState.gameOver && (
            <div className="text-center">
              <Button 
                onClick={startGame}
                className="game-button"
              >
                {gameState.round === 0 ? 'התחל משחק' : 'שחק שוב'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TriangleGame;