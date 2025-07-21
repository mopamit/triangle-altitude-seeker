import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GameLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  showBackButton?: boolean;
}

const GameLayout: React.FC<GameLayoutProps> = ({
  title,
  description,
  children,
  showBackButton = true
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      {/* Navigation Header */}
      {showBackButton && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="lg"
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border-2 border-blue-200 hover:border-blue-300 transition-all duration-300"
          >
            <Home className="w-5 h-5 mr-2" />
            תפריט ראשי
          </Button>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto">
        <Card className="shadow-2xl hover:shadow-3xl transition-all duration-500 animate-fade-in border-2 border-blue-100">
          <CardHeader className="text-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-90"></div>
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-repeat" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
            </div>
            
            <div className="relative z-10">
              <CardTitle className="text-4xl sm:text-5xl font-bold mb-4 text-white drop-shadow-lg">
                {title}
              </CardTitle>
              <p className="text-white/90 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                {description}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 bg-gradient-to-b from-white to-slate-50">
            {children}
          </CardContent>
        </Card>
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-200/20 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-cyan-200/20 rounded-full animate-float"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-pink-200/20 rounded-full animate-float-delayed"></div>
      </div>
    </div>
  );
};

export default GameLayout;