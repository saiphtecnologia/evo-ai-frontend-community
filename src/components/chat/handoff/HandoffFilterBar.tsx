import { Bot, Clock3, Headphones } from 'lucide-react';
import { Button } from '@evoapi/design-system/button';
import type { ConversationHandoffState } from '@/services/conversations/handoffService';

export type ActiveHandoffFilter = Exclude<ConversationHandoffState, 'CLOSED'> | null;

interface HandoffFilterBarProps {
  value: ActiveHandoffFilter;
  onChange: (value: ActiveHandoffFilter) => void;
}

const filters = [
  { value: 'AI_ACTIVE' as const, label: 'IA atendendo', Icon: Bot },
  { value: 'WAITING_HUMAN' as const, label: 'Aguardando humano', Icon: Clock3 },
  { value: 'HUMAN_ACTIVE' as const, label: 'Humano atendendo', Icon: Headphones },
];

export default function HandoffFilterBar({ value, onChange }: HandoffFilterBarProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Filtrar conversas por atendimento">
      <Button type="button" size="sm" variant={value === null ? 'secondary' : 'ghost'} aria-pressed={value === null} onClick={() => onChange(null)}>
        Todas
      </Button>
      {filters.map(({ value: option, label, Icon }) => (
        <Button key={option} type="button" size="sm" variant={value === option ? 'secondary' : 'ghost'} aria-pressed={value === option} className="shrink-0" onClick={() => onChange(option)}>
          <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </Button>
      ))}
    </div>
  );
}
