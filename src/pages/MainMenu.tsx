import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Triangle, 
  Square, 
  Circle, 
  Star, 
  Lock, 
  Play,
  Trophy,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import GameLayout from '@/components/GameLayout';
import ProgressSystem from '@/components/ProgressSystem';
import { GameConfig, ProgressData } from '@/lib/gameTypes';
import { useProgress } from '@/hooks/useProgress';

const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const [showProgress, setShowProgress] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'triangle' | 'quadrilateral' | 'circle'>('all');
  const { progress, getGameUnlocked } = useProgress();

  const gameConfigs: GameConfig[] = [
    {
      id: 'altitude',
      name: 'גובה במשולש',
      description: 'מצא את הקו הניצב מקודקוד לצלע מנוגדת',
      icon: '📐',
      difficulty: 'easy',
      category: 'triangle',
      unlocked: true,
      bestScore: progress.gameProgress.altitude.bestScore,
      stars: progress.gameProgress.altitude.stars,
    },
    {
      id: 'median',
      name: 'תיכון במשולש',
      description: 'זהה את הקו המחבר קודקוד לאמצע הצלע מנוגדת',
      icon: '📏',
      difficulty: 'medium',
      category: 'triangle',
      unlocked: getGameUnlocked('median'),
      bestScore: progress.gameProgress.median.bestScore,
      stars: progress.gameProgress.median.stars,
    },
    {
      id: 'angle-bisector',
      name: 'חוצה זווית',
      description: 'מצא את הקו החוצה זווית במשולש',
      icon: '✂️',
      difficulty: 'hard',
      category: 'triangle',
      unlocked: getGameUnlocked('angle-bisector'),
      bestScore: progress.gameProgress['angle-bisector'].bestScore,
      stars: progress.gameProgress['angle-bisector'].stars,
    },
    {
      id: 'diagonal',
      name: 'אלכסון במרובע',
      description: 'זהה אלכסונים במלבן, ריבוע ומקבילית',
      icon: '⬛',
      difficulty: 'medium',
      category: 'quadrilateral',
      unlocked: getGameUnlocked('diagonal'),
      bestScore: progress.gameProgress.diagonal.bestScore,
      stars: progress.gameProgress.diagonal.stars,
    },
    {
      id: 'circle-center',
      name: 'מרכז מעגל',
      description: 'מצא את מרכז המעגל החוסם או הפנימי',
      icon: '⭕',
      difficulty: 'hard',
      category: 'circle',
      unlocked: getGameUnlocked('circle-center'),
      bestScore: progress.gameProgress['circle-center'].bestScore,
      stars: progress.gameProgress['circle-center'].stars,
    },
  ];

  const categories = [
    { id: 'all', name: 'הכל', icon: Sparkles, color: 'bg-blue-500' },
    { id: 'triangle', name: 'משולשים', icon: Triangle, color: 'bg-blue-500' },
    { id: 'quadrilateral', name: 'מרובעים', icon: Square, color: 'bg-green-500' },
    { id: 'circle', name: 'מעגלים', icon: Circle, color: 'bg-orange-500' },
  ] as const;

  const filteredGames = selectedCategory === 'all' 
    ? gameConfigs 
    : gameConfigs.filter(game => game.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'קל';
      case 'medium': return 'בינוני';
      case 'hard': return 'קשה';
      default: return difficulty;
    }
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < count ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (showProgress) {
    return (
      <GameLayout 
        title="📊 התקדמות והישגים" 
        description="עקוב אחר הביצועים שלך והפוך למאסטר הגיאומטריה!"
        showBackButton={false}
      >
        <div className="space-y-6">
          <Button
            onClick={() => setShowProgress(false)}
            variant="outline"
            size="lg"
            className="mb-6"
          >
            <ChevronRight className="w-5 h-5 mr-2" />
            חזרה לתפריט
          </Button>
          <ProgressSystem progress={progress} />
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout 
      title="🔺 אקדמיית הגיאומטריה" 
      description="למד ותרגל מושגים גיאומטריים בדרך מהנה ואינטראקטיבית"
      showBackButton={false}
    >
      <div className="space-y-8">
        {/* Progress Summary & Navigation */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{progress.totalStars}</div>
              <div className="text-sm text-muted-foreground">כוכבים</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Object.values(progress.gameProgress).filter(g => g.completed).length}
              </div>
              <div className="text-sm text-muted-foreground">הושלמו</div>
            </div>
          </div>
          
          <Button
            onClick={() => setShowProgress(true)}
            variant="outline"
            size="lg"
            className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200"
          >
            <Trophy className="w-5 h-5 mr-2" />
            התקדמות והישגים
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="lg"
                className={`${
                  selectedCategory === category.id 
                    ? `${category.color} text-white hover:opacity-90` 
                    : 'hover:bg-gray-50'
                } transition-all duration-300`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {category.name}
              </Button>
            );
          })}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <Card
              key={game.id}
              className={`group transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 ${
                game.unlocked 
                  ? 'hover:border-blue-300 cursor-pointer' 
                  : 'opacity-60 cursor-not-allowed border-gray-200'
              }`}
              onClick={() => game.unlocked && navigate(`/game/${game.id}`)}
            >
              <CardHeader className="text-center relative">
                <div className="absolute top-4 right-4">
                  {game.unlocked ? (
                    <div className="flex">{renderStars(game.stars)}</div>
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                <div className="text-6xl mb-4 group-hover:animate-bounce">
                  {game.icon}
                </div>
                
                <CardTitle className="text-xl font-bold">{game.name}</CardTitle>
                
                <div className="flex justify-center gap-2 mt-2">
                  <Badge className={getDifficultyColor(game.difficulty)}>
                    {getDifficultyText(game.difficulty)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">{game.description}</p>
                
                {game.bestScore > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    שיא אישי: {game.bestScore}%
                  </div>
                )}
                
                <Button
                  disabled={!game.unlocked}
                  size="lg"
                  className={`w-full transition-all duration-300 ${
                    game.unlocked 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white' 
                      : ''
                  }`}
                >
                  {game.unlocked ? (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      שחק עכשיו
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      נעול
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-muted-foreground">
              אין משחקים בקטגוריה זו
            </h3>
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default MainMenu;