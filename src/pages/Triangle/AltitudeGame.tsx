import React from 'react';
import GameLayout from '@/components/GameLayout';
import TriangleGame from '@/components/TriangleGame';

const AltitudeGame: React.FC = () => {
  return (
    <GameLayout 
      title="📐 גובה במשולש" 
      description="מצא את הקו הניצב מהקודקוד לצלע המנוגדת"
      showBackButton={true}
    >
      <TriangleGame />
    </GameLayout>
  );
};

export default AltitudeGame;