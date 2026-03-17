import React from 'react';

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Base JP Structure with surgical cuts */}
      <path 
        d="M30 20V60C30 71.0457 38.9543 80 50 80C50 80 50 80 50 80V80" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round"
      />
      <path 
        d="M45 20H70C81.0457 20 90 28.9543 90 40C90 51.0457 81.0457 60 70 60H45" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round"
      />
      
      {/* Surgical Cuts (Negative Space lines) */}
      <line x1="42" y1="20" x2="42" y2="80" stroke="var(--background)" strokeWidth="2" />
      <line x1="15" y1="60" x2="85" y2="60" stroke="var(--background)" strokeWidth="2" />
      
      {/* Tech Nodes */}
      <circle cx="45" cy="40" r="3" fill="var(--accent)" />
      <circle cx="70" cy="60" r="2" fill="currentColor" />
      <circle cx="30" cy="60" r="2" fill="currentColor" />
      
      {/* Precision Lines */}
      <path d="M45 30V50" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5" />
    </svg>
  );
};
