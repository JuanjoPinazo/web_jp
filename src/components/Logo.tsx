'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

// Restoration of original logos with theme-aware blending for maximum integration.
export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by waiting for mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} />;
  }

  // Default to dark theme logo for initial client render if theme is not yet available
  const logoSrc = theme === 'light' ? '/logo_jp_negro.png' : '/logo_jp_blanco.png';
  
  return (
    <div className={`relative ${className} overflow-hidden rounded-full flex items-center justify-center`}>
      <Image
        src={logoSrc}
        alt="JP Intelligence Platform Logo"
        width={48}
        height={48}
        className="object-contain w-full h-full"
        priority
      />
    </div>
  );
};
