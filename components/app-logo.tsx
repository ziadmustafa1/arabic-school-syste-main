import React, { memo } from 'react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
  href?: string;
  responsive?: boolean;
}

const logoSizes = {
  xs: { size: 'h-8 w-8', width: 32, height: 32 },
  sm: { size: 'h-10 w-10', width: 40, height: 40 },
  md: { size: 'h-12 w-12', width: 48, height: 48 },
  lg: { size: 'h-20 w-20', width: 80, height: 80 },
  xl: { size: 'h-24 w-24', width: 96, height: 96 },
};

const textSizes = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export const AppLogo = memo(function AppLogo({ 
  size = 'md', 
  showText = true, 
  className, 
  textClassName, 
  href,
  responsive = true 
}: AppLogoProps) {
  const { size: sizeClass, width, height } = logoSizes[size];

  const logo = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(sizeClass, "relative")}>
        <Image 
          src="/rased-logo.png" 
          alt="راصد"
          width={width}
          height={height}
          priority
          className="object-contain"
        />
      </div>
      {showText && (
        <div className={cn(
          "font-semibold", 
          responsive && "hidden sm:block", 
          textSizes[size],
          textClassName
        )}>
          {responsive ? (
            <>
              <span className="hidden md:inline">نظام راصد التحفيزي</span>
              <span className="inline md:hidden">راصد</span>
            </>
          ) : (
            "نظام راصد التحفيزي"
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
        {logo}
      </Link>
    );
  }

  return logo;
}); 