import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      
      <path d="M256 80C158.8 80 80 158.8 80 256C80 353.2 158.8 432 256 432C304.6 432 348.5 412.3 380.5 380.5" 
            stroke="url(#logoGradient)" 
            strokeWidth="60" 
            strokeLinecap="round" 
      />
            
      <path d="M365 365L440 440" 
            stroke="url(#logoGradient)" 
            strokeWidth="60" 
            strokeLinecap="round" 
      />
            
      <path d="M176 256L240 320L336 176" 
            stroke="url(#logoGradient)" 
            strokeWidth="50" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
      />
    </svg>
  );
};
