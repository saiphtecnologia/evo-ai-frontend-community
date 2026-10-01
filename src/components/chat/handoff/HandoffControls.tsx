import { useState } from 'react';
import { Bot, Clock3, Headphones, LockKeyhole } from 'lucide-react';
import { Button } from '@evoapi/design-system/button';
import { toast } from 'sonner';
import type { Conversation } from '@/types/chat/api';
import handoffService, { type ConversationHandoffState } from '@/services/conversations/handoffService';
import { getConversationHandoffState } from './handoffState';

interface HandoffControlsProps {
  conversation: Conversation;
  onChanged: (conversation: Conversation) => void;
}

const labels: Record<ConversationHandoffState, string> = {
  AI_ACTIVE: 'IA atendendo',
  WAITING_HUMAN: 'Aguardando humano',
  HUMAN_ACTIVE: 'Humano atendendo',
  CLOSED: 'Conversa encerrada',
};

const icons = {
  AI_ACTIVE: Bot,
  WAITING_HUMAN: Clock3,
  HUMAN_ACTIVE: Headphones,
  CLOSED: LockKeyhole,
};

export default function HandoffControls({ conversation, onChanged }: HandoffControlsProps) {
  const [pending, setPending] = useState<'take-over' | 'return-to-ai' | null>(null);
  const state = getConversationHandoffState(conversation);
  const Icon = icons[state];

  const transition = async (action: 'take-over' | 'return-to-ai') => {
    setPending(action);
    try {
      const updated = action === 'take-over'
        ? await handoffService.takeOver(conversation.id)
        : await handoffService.returnToAI(conversation.id);
      onChanged(updated);
      toast.success(action === 'take-over' ? 'Conversa assumida.' : 'Conversa devolvida para a IA.');
    } catch {
      toast.error('Não foi possível alterar o atendimento. Atualize a conversa e tente novamente.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/35 px-4 py-2" role="status" aria-live="polite">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="font-medium">{labels[state]}</span>
        {conversation.handoff_reason && state !== 'AI_ACTIVE' && (
          <span className="truncate text-muted-foreground" title={conversation.handoff_reason}>
            · {conversation.handoff_reason}
          </span>
        )}
      </div>
      {state === 'WAITING_HUMAN' && (
        <Button size="sm" disabled={pending !== null} onClick={() => transition('take-over')}>
          {pending === 'take-over' ? 'Assumindo…' : 'Assumir conversa'}
        </Button>
      )}
      {state === 'HUMAN_ACTIVE' && (
        <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => transition('return-to-ai')}>
          {pending === 'return-to-ai' ? 'Devolvendo…' : 'Devolver para IA'}
        </Button>
      )}
    </div>
  );
}
