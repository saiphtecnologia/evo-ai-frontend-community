export type BriefingStatus = 'DRAFT' | 'COMPLETED';
export type SuggestionStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type BusinessHours = { timezone: string; windows: Array<{ days: number[]; start: string; end: string }> };
export type BriefingContent = {
  companyData: { name: string; description: string }; site: string | null; instagram: string | null; address: string;
  businessHours: BusinessHours; services: string[]; products: string[]; allowedPrices: string[]; team: string[];
  professionals: string[]; faqs: Array<{ question: string; answer: string }>; toneOfVoice: string;
  restrictions: string[]; handoffRules: string[]; paymentMethods: string[]; insurancePlans: string[];
  pipelineStages: string[]; serviceObjective: string; additionalMaterials: string[];
};
export type AgentSuggestion = {
  id: string; briefingId: string; status: SuggestionStatus; version: number; reviewNote: string | null;
  activationAllowed: false;
  configuration: {
    behaviorConfiguration: { name: string; presentation: string; toneOfVoice: string; objective: string;
      canAnswer: string[]; cannotAnswer: string[]; handoffRules: string[]; fallbackMessage: string;
      outOfHoursMessage: string; schedule: BusinessHours };
    knowledgeDraft: Record<string,string[] | Array<{ question: string; answer: string }>>;
    pipelineStages: string[]; activation: { allowed: false; reason: 'ADMIN_REVIEW_REQUIRED' };
  };
};
export type Briefing = { id: string; status: BriefingStatus; version: number; content: Partial<BriefingContent>; completedAt: string | null };

const API = '/api/v1/saiph/implementation-briefing';

async function request<T>(path = '',init?: RequestInit): Promise<T> {
  const response=await fetch(`${API}${path}`,{ ...init,credentials:'include',headers:{ 'Content-Type':'application/json',...init?.headers } });
  if (!response.ok) throw new Error(response.status === 404
    ? 'O módulo de briefing ainda não está disponível nesta instalação.'
    : 'Não foi possível concluir a operação. Tente novamente.');
  return response.json() as Promise<T>;
}

export const briefingService = {
  async get() { return (await request<{ data:{ briefing:Briefing | null;suggestion:AgentSuggestion | null } }>()).data; },
  async saveDraft(input:{ briefingId:string | null;expectedVersion:number | null;content:BriefingContent }) {
    return (await request<{ data:Briefing }>('/draft',{ method:'PUT',body:JSON.stringify(input) })).data;
  },
  async complete(briefingId:string,expectedVersion:number) {
    return (await request<{ data:{ briefing:Briefing;suggestion:AgentSuggestion } }>('/complete',{
      method:'POST',body:JSON.stringify({ briefingId,expectedVersion }),
    })).data;
  },
  async review(suggestionId:string,decision:'APPROVED' | 'REJECTED',reason:string,expectedVersion:number) {
    return (await request<{ data:AgentSuggestion }>(`/suggestions/${encodeURIComponent(suggestionId)}/review`,{
      method:'POST',body:JSON.stringify({ decision,reason,expectedVersion }),
    })).data;
  },
};
