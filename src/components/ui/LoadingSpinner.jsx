import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Loading spinner component for lazy loading suspense fallback
 */
const LoadingSpinner = ({ 
  className,
  size = 'default',
  text = 'Ładowanie...',
  showText = true,
  fullScreen = true 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    default: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const containerClasses = fullScreen 
    ? 'flex flex-col items-center justify-center min-h-[50vh]'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={cn(containerClasses, className)}>
      <Loader2 
        className={cn(
          sizeClasses[size] || sizeClasses.default,
          'animate-spin text-primary'
        )} 
      />
      {showText && (
        <p className="mt-4 text-muted-foreground font-mono text-sm animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;