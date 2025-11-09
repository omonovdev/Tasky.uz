import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface FireProgressProps {
  deadline: string;
  createdAt: string;
  className?: string;
}

export default function FireProgress({ deadline, createdAt, className }: FireProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date().getTime();
      const start = new Date(createdAt).getTime();
      const end = new Date(deadline).getTime();
      
      // Calculate total duration in hours
      const totalDuration = end - start;
      
      // Calculate elapsed time
      const elapsed = now - start;
      
      // Calculate percentage (hours passed / total hours * 100)
      const percentage = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      
      setProgress(percentage);
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, [deadline, createdAt]);

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div 
        className="h-full transition-all duration-1000 ease-linear relative"
        style={{ 
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ff4500 0%, #ff6b00 25%, #ff8c00 50%, #ffa500 75%, #ffb732 100%)',
          boxShadow: '0 0 20px rgba(255, 69, 0, 0.8), 0 0 10px rgba(255, 107, 0, 0.6)'
        }}
      >
        {/* Animated fire effect */}
        <div className="absolute inset-0 opacity-60 animate-pulse">
          <div 
            className="h-full w-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}