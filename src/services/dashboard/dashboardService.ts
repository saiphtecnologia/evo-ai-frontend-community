import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type DashboardPeriod = '7d' | '30d' | '90d';

export type CompanyDashboard = {
  generatedAt: string;
  period: { key: DashboardPeriod; days: number; from: string; until: string; bucket: 'day'; timezone: 'UTC' };
  month: { from: string; until: string; timezone: 'UTC' };
  cards: { leadsThisMonth: number; conversationsThisMonth: number; aiUsed: number; franchiseRemaining: number };
  metrics: {
    aiAttendances: number; humanAttendances: number; opportunities: number;
    convertedLeads: number; conversionPercentage: number; connectedWhatsApps: number;
  };
  planUsage: {
    plan: string; used: number; limit: number; remaining: number; overage: number;
    percentage: number; renewalAt: string;
  };
  leadsByPeriod: Array<{ date: string; count: number }>;
  pipeline: {
    currency: string; totalOpportunities: number; totalValueMinor: number;
    stages: Array<{ id: string; name: string; position: number; count: number; valueMinor: number }>;
  };
};

export const dashboardService = {
  async get(period: DashboardPeriod): Promise<CompanyDashboard> {
    return extractData<CompanyDashboard>(await api.get('/api/v1/saiph/dashboard', { params: { period } }));
  },
};
