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

  // Horizontal lockup (Emblem on left + authentic Wordmark on right)
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${emblemSizes[size]} flex-shrink-0`}>
        <Image
          src="/images/terratern-emblem.png"
          alt="TerraTern Emblem"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <div className={`relative ${heights[size]} aspect-[484/85]`}>
            <Image
              src="/images/terratern-wordmark.png"
              alt="TerraTern"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          {showBadge && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#255CC1] border border-blue-200/80 rounded px-1.5 py-0.5">
              Portal
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-[-2px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
