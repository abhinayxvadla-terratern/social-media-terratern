import React from 'react';
import Image from 'next/image';

interface TerraTernLogoProps {
  className?: string;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'symbol' | 'horizontal' | 'image' | 'stacked';
  theme?: 'dark' | 'light';
  subtitle?: string;
}

export function TerraTernLogo({
  className = '',
  showBadge = false,
  size = 'md',
  variant = 'horizontal',
  theme = 'dark',
  subtitle,
}: TerraTernLogoProps) {
  // Height classes for horizontal and wordmark
  const heights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-14',
  };

  const emblemSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const stackedWidths = {
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-44',
    xl: 'w-60',
  };

  // Stacked Full Logo (Emblem on top, Wordmark on bottom, like the uploaded mark)
  if (variant === 'stacked' || variant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        <div className={`relative aspect-[484/543] ${stackedWidths[size]}`}>
          <Image
            src="/images/terratern-logo-full.png"
            alt="TerraTern Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        {subtitle && (
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  // Symbol only (Tern + Globe emblem)
  if (variant === 'symbol') {
    return (
      <div className={`relative ${emblemSizes[size]} select-none flex-shrink-0 ${className}`}>
        <Image
          src="/images/terratern-emblem.png"
          alt="TerraTern Emblem"
          fill
          className="object-contain"
          priority
        />
      </div>
    );
  }

  // Horizontal lockup (Using official brand logo in all headers)
  const logoSrc =
    theme === 'light'
      ? '/images/terratern-logo-white.png'
      : '/images/terratern-header-logo.png';

  const logoHeights = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-14',
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className={`relative ${logoHeights[size]} aspect-[901/281] flex-shrink-0`}>
        <Image
          src={logoSrc}
          alt="TerraTern"
          fill
          className="object-contain object-left"
          priority
        />
      </div>
    </div>
  );
}
