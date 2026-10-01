import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type UsageAlert = { threshold: 80 | 100; reached: boolean; severity: 'warning' | 'critical' };
export type CompanyUsageDashboard = {
  plan: string;
  aiAttendances: { used: number; limit: number; overage: number };
  percentage: number;
  renewalAt: string;
  alerts: UsageAlert[];
};
export type AdminUsageRow = {
  companyId: string; company: string; plan: string; limit: number; usage: number; overage: number;
  tokens: number; estimatedCostMicrounits: number; currency: string; alert: 80 | 100 | null;
};

export const usageService = {
  async companyDashboard(): Promise<CompanyUsageDashboard> {
    const response = await api.get('/saiph/usage/dashboard');
    return extractData<CompanyUsageDashboard>(response);
  },
  async adminDashboard(params: { search?: string; alert?: 'all' | '80' | '100'; page?: number; pageSize?: number } = {}) {
    const response = await api.get('/saiph-admin/usage', { params });
    return extractData<{ rows: AdminUsageRow[]; total: number; page: number; pageSize: number }>(response);
  },
};
