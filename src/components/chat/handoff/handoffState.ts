import type { Conversation } from '@/types/chat/api';
import type { ConversationHandoffState } from '@/services/conversations/handoffService';

export function getConversationHandoffState(conversation: Conversation): ConversationHandoffState {
  const direct = conversation.handoff_state;
  const projected = conversation.additional_attributes?.saiph_handoff_state;
  const value = direct ?? projected;
  return ['AI_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE', 'CLOSED'].includes(String(value))
    ? value as ConversationHandoffState
    : 'CLOSED';
}
