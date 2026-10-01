import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type PlanFeatureValue = boolean | number;
export type PlanSnapshot = {
  id: string; code: string; name: string; version: number;
  setupPrice: number; monthlyPrice: number; currency: string; active: boolean;
  features: Record<string,PlanFeatureValue>;
};

export const planService = {
  async current(): Promise<PlanSnapshot> {
    return extractData<PlanSnapshot>(await api.get('/saiph/plans/current'));
  },
  async list(): Promise<PlanSnapshot[]> {
    return extractData<PlanSnapshot[]>(await api.get('/saiph-admin/plans'));
  },
  async update(planId: string,input: Partial<Pick<PlanSnapshot,'name' | 'setupPrice' | 'monthlyPrice' | 'currency' | 'active' | 'features'>>,reason: string): Promise<PlanSnapshot> {
    return extractData<PlanSnapshot>(await api.patch(`/saiph-admin/plans/${encodeURIComponent(planId)}`,{ input,reason }));
  },
};

