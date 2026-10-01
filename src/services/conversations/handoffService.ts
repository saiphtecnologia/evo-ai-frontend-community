import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { Conversation } from '@/types/chat/api';

export type ConversationHandoffState = 'AI_ACTIVE' | 'WAITING_HUMAN' | 'HUMAN_ACTIVE' | 'CLOSED';

const handoffService = {
  async takeOver(conversationId: string): Promise<Conversation> {
    const response = await api.post(`/saiph/conversations/${encodeURIComponent(conversationId)}/handoff/take-over`);
    return extractData<Conversation>(response);
  },

  async returnToAI(conversationId: string): Promise<Conversation> {
    const response = await api.post(`/saiph/conversations/${encodeURIComponent(conversationId)}/handoff/return-to-ai`);
    return extractData<Conversation>(response);
  },
};

export default handoffService;
