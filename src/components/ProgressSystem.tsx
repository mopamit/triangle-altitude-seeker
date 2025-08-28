import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target, Zap } from 'lucide-react';
import { ProgressData } from '@/lib/gameTypes';

interface ProgressSystemProps {
  progress: ProgressData;
}

const ProgressSystem: React.FC<ProgressSystemProps> = ({ progress }) => {
  const totalGames = Object.keys(progress.gameProgress).length;
  const completedGames = Object.values(progress.gameProgress).filter(g => g.completed).length;
  const progressPercentage = totalGames > 0 ? (completedGames / totalGames) * 100 : 0;

  const getProgressLevel = () => {
    if (progress.totalStars >= 15) return { title: 'מאסטר גיאומטריה', color: 'text-blue-600', icon: '👑' };
    if (progress.totalStars >= 10) return { title: 'מומחה צורות', color: 'text-blue-600', icon: '🏆' };
    if (progress.totalStars >= 5) return { title: 'חוקר מתקדם', color: 'text-green-600', icon: '⭐' };
    return { title: 'מתחיל נלהב', color: 'text-orange-600', icon: '🚀' };
  };

  const level = getProgressLevel();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <span className="text-3xl">{level.icon}</span>
            <span className={level.color}>{level.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>התקדמות כללית</span>
              <span>{completedGames}/{totalGames} משחקים</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{progress.totalStars}</div>
              <div className="text-sm text-muted-foreground">כוכבים</div>
            </div>

            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{completedGames}</div>
              <div className="text-sm text-muted-foreground">הושלמו</div>
            </div>

            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <Star className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{Math.round(progress.averageScore)}%</div>
              <div className="text-sm text-muted-foreground">ממוצע</div>
            </div>

            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <Zap className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{progress.totalGamesCompleted}</div>
              <div className="text-sm text-muted-foreground">סה"כ ניסיונות</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">הישגים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'צעדים ראשונים', condition: progress.totalGamesCompleted >= 1, icon: '🎯', earned: true },
              { name: 'חמישייה!', condition: progress.totalStars >= 5, icon: '⭐', earned: progress.totalStars >= 5 },
              { name: 'מלא כוכבים', condition: progress.totalStars >= 10, icon: '🌟', earned: progress.totalStars >= 10 },
              { name: 'אמן הגיאומטריה', condition: progress.totalStars >= 15, icon: '👑', earned: progress.totalStars >= 15 },
            ].map((achievement, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-300 ${
                  achievement.earned
                    ? 'bg-yellow-50 border-yellow-300 shadow-lg transform hover:scale-105'
                    : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className={`text-sm font-medium ${achievement.earned ? 'text-yellow-700' : 'text-gray-500'}`}>
                  {achievement.name}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressSystem;