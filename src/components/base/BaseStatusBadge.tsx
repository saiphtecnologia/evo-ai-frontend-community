import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export interface BaseStatusBadgeProps {
  status: 'active' | 'inactive' | 'blocked' | 'pending' | 'success' | 'error' | 'warning';
  text?: string;
  className?: string;
}

const statusConfig = {
  active: {
    className: 'saiph-tone-success',
  },
  inactive: {
    className: 'saiph-tone-secondary',
  },
  blocked: {
    className: 'saiph-tone-error',
  },
  pending: {
    className: 'saiph-tone-warning',
  },
  success: {
    className: 'saiph-tone-success',
  },
  error: {
    className: 'saiph-tone-error',
  },
  warning: {
    className: 'saiph-tone-warning',
  }
};

export default function BaseStatusBadge({ status, text, className }: BaseStatusBadgeProps) {
  const { t } = useLanguage('common');
  const config = statusConfig[status];
  const defaultText = t(`base.status.${status}`);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        'gap-1.5 border',
        config.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {text || defaultText}
    </span>
  );
}
