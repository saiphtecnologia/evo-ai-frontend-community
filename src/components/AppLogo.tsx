import type { CSSProperties } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

interface AppLogoProps {
  className?: string;
  alt?: string;
  style?: CSSProperties;
  forceTheme?: 'dark' | 'light';
}

// Modified by SAIPH: original SAIPH assets replace all Evo CRM brand assets.
export function AppLogo({ className, alt = 'SAIPH Flow', style, forceTheme }: AppLogoProps) {
  const { theme } = useDarkMode();
  const effectiveTheme = forceTheme ?? theme;
  const src = effectiveTheme === 'dark' ? '/saiph-flow-logo-dark.svg' : '/saiph-flow-logo-light.svg';

  return <img src={src} alt={alt} className={className} style={style} data-saiph-brand-lockup />;
}
