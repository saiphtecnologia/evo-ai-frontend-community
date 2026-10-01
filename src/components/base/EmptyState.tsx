import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import PrimaryActionButton from './PrimaryActionButton';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
    className?: string;
    disabled?: boolean;
    tooltip?: string;
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "saiph-state-panel border-dashed",
      className
    )} role="status">
      {Icon && (
        <div className="saiph-state-icon" aria-hidden="true">
          <Icon className="h-6 w-6" />
        </div>
      )}

      <h2 className="text-lg font-semibold text-foreground">
        {title}
      </h2>

      <p className="text-sm leading-6 text-muted-foreground max-w-md">
        {description}
      </p>

      {action && (
        <PrimaryActionButton
          label={action.label}
          onClick={action.onClick}
          size="default"
          variant={action.variant}
          className={action.className}
          disabled={action.disabled}
          tooltip={action.tooltip}
        />
      )}
    </div>
  );
}
