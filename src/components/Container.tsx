import React from 'react';

export const Container = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`w-full max-w-5xl px-6 mx-auto ${className}`}>
      {children}
    </div>
  );
};
