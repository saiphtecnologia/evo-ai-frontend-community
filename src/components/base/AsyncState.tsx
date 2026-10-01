import { AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { cn } from '@/utils/cn';

interface LoadingStateProps {
  label: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

interface ErrorStateProps {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function LoadingState({ label, description, compact = false, className }: LoadingStateProps) {
  return (
    <div
      className={cn('saiph-state-panel', compact && 'min-h-40', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="saiph-state-icon" aria-hidden="true">
        <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{label}</p>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid w-full max-w-md grid-cols-3 gap-3" aria-hidden="true">
        <span className="saiph-skeleton h-2 rounded-full" />
        <span className="saiph-skeleton col-span-2 h-2 rounded-full" />
        <span className="saiph-skeleton col-span-2 h-2 rounded-full" />
        <span className="saiph-skeleton h-2 rounded-full" />
      </div>
    </div>
  );
}

export function ErrorState({ title, description, retryLabel, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('saiph-state-panel', className)} role="alert" aria-live="assertive">
      <div className="saiph-state-icon saiph-tone-error" aria-hidden="true">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && retryLabel && (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
