import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type SuperAdminDashboardPeriod = '7d' | '30d' | '90d';
export type SuperAdminCompanyStatus = 'active' | 'onboarding' | 'suspended';
export type SuperAdminAlertCode =
  | 'whatsapp_offline' | 'usage_above_80' | 'usage_above_100'
  | 'ai_recurring_error' | 'onboarding_stalled';

export type SuperAdminDashboard = {
  generatedAt: string;
  period: { key: SuperAdminDashboardPeriod; days: number; from: string; until: string; timezone: 'UTC' };
  summary: {
    companies: { active: number; onboarding: number; suspended: number };
    commercial: { manualMrrMinor: number; setupSoldMinor: number; currency: string };
    whatsApp: { connected: number; offline: number };
    ai: { usage: number; estimatedCostMicrounits: number; currency: string; attendances: number };
  };
  plans: Array<{ name: string; count: number }>;
  alerts: Array<{ code: SuperAdminAlertCode; severity: 'warning' | 'critical'; count: number }>;
  rows: Array<{
    companyId: string; company: string; plan: string; monthlyFeeMinor: number; currency: string;
    aiUsage: number; aiLimit: number; aiOverage: number;
    whatsApp: { connected: number; offline: number }; status: SuperAdminCompanyStatus;
  }>;
  pagination: { total: number; page: number; pageSize: number };
};

export type SuperAdminDashboardFilters = {
  period: SuperAdminDashboardPeriod;
  search?: string;
  status?: 'all' | SuperAdminCompanyStatus;
  alert?: 'all' | SuperAdminAlertCode;
  page?: number;
  pageSize?: number;
};

export const superAdminDashboardService = {
  async get(filters: SuperAdminDashboardFilters): Promise<SuperAdminDashboard> {
    return extractData<SuperAdminDashboard>(await api.get('/saiph-admin/dashboard', { params: filters }));
  },
};
