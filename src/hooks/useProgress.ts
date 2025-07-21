import { useState, useEffect } from 'react';
import { ProgressData } from '@/lib/gameTypes';

const STORAGE_KEY = 'geometry-game-progress';

const initialProgress: ProgressData = {
  totalGamesCompleted: 0,
  totalStars: 0,
  averageScore: 0,
  gameProgress: {
    'altitude': { completed: false, bestScore: 0, stars: 0, attempts: 0 },
    'median': { completed: false, bestScore: 0, stars: 0, attempts: 0 },
    'angle-bisector': { completed: false, bestScore: 0, stars: 0, attempts: 0 },
    'diagonal': { completed: false, bestScore: 0, stars: 0, attempts: 0 },
    'circle-center': { completed: false, bestScore: 0, stars: 0, attempts: 0 },
  }
};

export const useProgress = () => {
  const [progress, setProgress] = useState<ProgressData>(initialProgress);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProgress(parsed);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }, []);

  // Save to localStorage whenever progress changes
  const saveProgress = (newProgress: ProgressData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const updateGameProgress = (gameId: string, gameResult: { score: number; totalRounds: number; stars: number }) => {
    const percentage = Math.round((gameResult.score / gameResult.totalRounds) * 100);
    
    setProgress(currentProgress => {
      const newProgress = { ...currentProgress };
      const currentGame = newProgress.gameProgress[gameId] || { completed: false, bestScore: 0, stars: 0, attempts: 0 };
      
      // Update game specific progress
      newProgress.gameProgress[gameId] = {
        completed: true,
        bestScore: Math.max(currentGame.bestScore, percentage),
        stars: Math.max(currentGame.stars, gameResult.stars),
        attempts: currentGame.attempts + 1
      };
      
      // Recalculate totals
      const allGames = Object.values(newProgress.gameProgress);
      newProgress.totalGamesCompleted = allGames.filter(g => g.completed).length;
      newProgress.totalStars = allGames.reduce((sum, game) => sum + game.stars, 0);
      newProgress.averageScore = allGames.length > 0 
        ? allGames.reduce((sum, game) => sum + game.bestScore, 0) / allGames.length 
        : 0;
      
      saveProgress(newProgress);
      return newProgress;
    });
  };

  const resetProgress = () => {
    saveProgress(initialProgress);
  };

  const getGameUnlocked = (gameId: string): boolean => {
    // First game is always unlocked
    if (gameId === 'altitude') return true;
    
    // Define game progression order
    const gameOrder = ['altitude', 'median', 'angle-bisector', 'diagonal', 'circle-center'];
    const currentIndex = gameOrder.indexOf(gameId);
    
    if (currentIndex <= 0) return true;
    
    // Check if previous game is completed
    const previousGameId = gameOrder[currentIndex - 1];
    return progress.gameProgress[previousGameId]?.completed || false;
  };

  return {
    progress,
    updateGameProgress,
    resetProgress,
    getGameUnlocked
  };
};