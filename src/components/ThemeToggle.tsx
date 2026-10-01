// Modified by SAIPH: accessible Escuro/Claro/Automático selector.
import { useLanguage } from '@/hooks/useLanguage';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@evoapi/design-system';
import { useDarkMode } from '../hooks/useDarkMode';
import type { ThemePreference } from '../contexts/ThemeContext';

const automaticLabels = {
  'pt-BR': 'Automático',
  pt: 'Automático',
  en: 'System',
  es: 'Automático',
  fr: 'Système',
  it: 'Sistema',
};

export function ThemeToggle() {
  const { t, currentLanguage } = useLanguage('common');
  const { preference, setPreference } = useDarkMode();
  const automaticLabel = automaticLabels[currentLanguage] ?? automaticLabels.en;

  const options: Array<{
    value: ThemePreference;
    label: string;
    icon: typeof Moon;
  }> = [
    { value: 'dark', label: t('base.theme.dark'), icon: Moon },
    { value: 'light', label: t('base.theme.light'), icon: Sun },
    { value: 'system', label: automaticLabel, icon: Monitor },
  ];
  const ActiveIcon = options.find(option => option.value === preference)?.icon ?? Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 min-w-9 gap-2 px-2 hover:bg-accent cursor-pointer"
          aria-label={t('base.theme.toggle')}
          aria-haspopup="menu"
        >
          <ActiveIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t('base.theme.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {options.map(option => {
          const Icon = option.icon;
          const selected = preference === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setPreference(option.value)}
              className="gap-2 cursor-pointer"
              aria-checked={selected}
              role="menuitemradio"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{option.label}</span>
              {selected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
