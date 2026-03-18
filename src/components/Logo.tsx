import React from 'react';

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* 
          A sophisticated "JP" monogram based on the provided design.
          Uses a continuous bold stroke with interlocking loops.
      */}
      <path 
        d="M50 15V45C50 45 78 45 78 65C78 85 50 85 35 65L22 45C7 25 35 25 50 45V85" 
        stroke="currentColor" 
        strokeWidth="14" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Optional accent node to maintain technical feel but keeping it clean */}
      <circle cx="50" cy="45" r="3" fill="var(--accent)" />
    </svg>
  );
};
