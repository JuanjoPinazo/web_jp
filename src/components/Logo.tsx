'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

// Restoration of original logos with theme-aware blending for maximum integration.
export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  const { theme } = useTheme();
  
  // Use original branding assets
  const logoSrc = theme === 'light' ? '/logo_jp_negro.png' : '/logo_jp_blanco.png';
  
  return (
    <div className={`relative ${className} overflow-hidden rounded-full`}>
      <Image
        src={logoSrc}
        alt="Juanjo Pinazo Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
};
