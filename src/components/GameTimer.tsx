import React, { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface GameTimerProps {
  timeRemaining: number;
  timeLimit: number;
  isActive: boolean;
  onTimeUp: () => void;
  onTick: () => void;
}

const GameTimer: React.FC<GameTimerProps> = ({
  timeRemaining,
  timeLimit,
  isActive,
  onTimeUp,
  onTick
}) => {
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      if (timeRemaining <= 1) {
        onTimeUp();
      } else {
        onTick();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isActive, onTimeUp, onTick]);

  const percentage = (timeRemaining / timeLimit) * 100;
  const isWarning = percentage <= 30;
  const isCritical = percentage <= 10;

  const getTimerColor = () => {
    if (isCritical) return 'error';
    if (isWarning) return 'warning';
    return 'success';
  };

  const getTimerClasses = () => {
    const baseClasses = 'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all duration-300';
    const colorClasses = {
      success: 'bg-success/10 text-success border border-success/30',
      warning: 'bg-warning/10 text-warning border border-warning/30 animate-pulse',
      error: 'bg-error/10 text-error border border-error/30 animate-bounce'
    };
    
    return `${baseClasses} ${colorClasses[getTimerColor()]}`;
  };

  if (!isActive) return null;

  return (
    <div className={getTimerClasses()}>
      {isCritical ? (
        <AlertTriangle className="w-5 h-5 animate-bounce" />
      ) : (
        <Clock className="w-5 h-5" />
      )}
      <span className="text-lg">
        {timeRemaining}s
      </span>
      
      {/* Progress bar */}
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            isCritical ? 'bg-error' : isWarning ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default GameTimer;