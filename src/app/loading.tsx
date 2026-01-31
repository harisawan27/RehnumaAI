import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Sparkles className="text-white" size={32} />
            </div>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 truncate">
              RehnumaAI
            </h1>
        <p className="text-muted-foreground">Loading your study guide...</p>
      </div>
    </div>
  );
}
