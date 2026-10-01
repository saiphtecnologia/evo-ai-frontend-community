import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING_WHATSAPP' | 'TESTING' | 'READY' | 'LIVE';
export type OnboardingDraft = Record<string,unknown>;
export type OnboardingSession = {
  id: string; companyId: string | null; status: OnboardingStatus; currentStep: number; version: number;
  draft: OnboardingDraft; result: Record<string,number>; errorCode: string | null; replay: boolean;
  checklist: Array<{ number: number; key: string; label: string; completed: boolean }>;
  tasks: Array<{ key: string; status: 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'; errorCode: string | null }>;
};
export type OnboardingOptions = {
  plans: Array<{ id:string; name:string; version:number; monthlyPrice:number; currency:string }>;
  templates: Array<{ id:string; name:string; niche:string; description:string }>;
};

export const onboardingService = {
  async options(): Promise<OnboardingOptions> {
    return extractData<OnboardingOptions>(await api.get('/saiph-admin/onboarding/options'));
  },
  async start(idempotencyKey:string): Promise<OnboardingSession> {
    return extractData<OnboardingSession>(await api.post('/saiph-admin/onboarding',{ idempotencyKey }));
  },
  async get(onboardingId:string): Promise<OnboardingSession> {
    return extractData<OnboardingSession>(await api.get(`/saiph-admin/onboarding/${encodeURIComponent(onboardingId)}`));
  },
  async saveStep(onboardingId:string,stepNumber:number,input:Record<string,unknown>,expectedVersion:number): Promise<OnboardingSession> {
    return extractData<OnboardingSession>(await api.patch(`/saiph-admin/onboarding/${encodeURIComponent(onboardingId)}/steps/${stepNumber}`,{ input,expectedVersion }));
  },
  async complete(onboardingId:string,idempotencyKey:string,expectedVersion:number): Promise<OnboardingSession> {
    return extractData<OnboardingSession>(await api.post(`/saiph-admin/onboarding/${encodeURIComponent(onboardingId)}/complete`,{ idempotencyKey,expectedVersion }));
  },
};
