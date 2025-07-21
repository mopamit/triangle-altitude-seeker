import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  stars: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  animated?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  stars,
  maxStars = 3,
  size = 'md',
  showCount = false,
  animated = true
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const renderStars = () => {
    return Array.from({ length: maxStars }, (_, i) => (
      <Star
        key={i}
        className={`${sizeClasses[size]} transition-all duration-300 ${
          i < stars 
            ? 'text-warning fill-current' 
            : 'text-muted-foreground'
        } ${animated && i < stars ? 'animate-bounce' : ''}`}
        style={{
          animationDelay: animated ? `${i * 100}ms` : '0ms'
        }}
      />
    ));
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1">
        {renderStars()}
      </div>
      {showCount && (
        <span className="text-sm font-medium text-muted-foreground ml-2">
          {stars}/{maxStars}
        </span>
      )}
    </div>
  );
};

export default StarRating;