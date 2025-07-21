import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Clock, Zap } from 'lucide-react';

interface DifficultyLevel {
  id: 'easy' | 'medium' | 'hard';
  name: string;
  description: string;
  timeLimit: number;
  icon: React.ReactNode;
  color: string;
  stars: number;
}

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onSelectDifficulty }) => {
  const difficulties: DifficultyLevel[] = [
    {
      id: 'easy',
      name: 'קל',
      description: 'משולשים פשוטים עם זמן רב',
      timeLimit: 45,
      icon: <Star className="w-6 h-6" />,
      color: 'success',
      stars: 1
    },
    {
      id: 'medium',
      name: 'בינוני',
      description: 'משולשים מורכבים יותר',
      timeLimit: 30,
      icon: <Zap className="w-6 h-6" />,
      color: 'warning',
      stars: 2
    },
    {
      id: 'hard',
      name: 'קשה',
      description: 'משולשים מורכבים עם זמן מוגבל',
      timeLimit: 20,
      icon: <Clock className="w-6 h-6" />,
      color: 'error',
      stars: 3
    }
  ];

  const renderStars = (count: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < count ? 'text-warning fill-current' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-3">בחר רמת קושי</h2>
        <p className="text-muted-foreground text-lg">
          כל רמה מציעה אתגר שונה עם משולשים מורכבים יותר והגבלות זמן
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {difficulties.map((level) => (
          <Card
            key={level.id}
            className={`difficulty-card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-${level.color} group`}
            onClick={() => onSelectDifficulty(level.id)}
          >
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto mb-3 w-16 h-16 rounded-full bg-${level.color}/10 flex items-center justify-center text-${level.color} group-hover:bg-${level.color}/20 transition-all duration-300`}>
                {level.icon}
              </div>
              <CardTitle className="text-2xl font-bold">{level.name}</CardTitle>
              <div className="flex justify-center space-x-1 mt-2">
                {renderStars(level.stars)}
              </div>
            </CardHeader>

            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{level.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{level.timeLimit} שניות לסיבוב</span>
                </div>
              </div>

              <Button
                className={`w-full game-button-${level.color} font-semibold py-2 transition-all duration-300 hover:scale-105`}
                onClick={() => onSelectDifficulty(level.id)}
              >
                בחר רמה זו
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 טיפ: התחל ברמה הקלה כדי להכיר את המשחק</p>
      </div>
    </div>
  );
};

export default DifficultySelector;