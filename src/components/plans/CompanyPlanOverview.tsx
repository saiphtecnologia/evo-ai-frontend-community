import { useCallback, useEffect, useState } from 'react';
import { Check, Minus, RefreshCw } from 'lucide-react';
import { planService } from '@/services/plans/planService';
import type { PlanSnapshot } from '@/services/plans/planService';

const labels: Record<string,string> = {
  ai_enabled: 'Inteligência artificial', automation_enabled: 'Automações',
  knowledge_base_enabled: 'Base de conhecimento', max_users: 'Máximo de usuários',
  max_whatsapp_connections: 'Conexões WhatsApp', monthly_ai_conversations: 'Atendimentos IA por mês',
};
const money = (value: number,currency: string) => new Intl.NumberFormat('pt-BR',{ style: 'currency',currency }).format(value);

export default function CompanyPlanOverview() {
  const [plan,setPlan] = useState<PlanSnapshot | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPlan(await planService.current()); }
    catch { setError('Os detalhes do plano ainda não estão disponíveis nesta instalação.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(() => { void load(); },[load]);
  if (loading) return <section aria-label="Detalhes do plano" aria-busy="true" className="min-h-32 animate-pulse rounded-xl border bg-card p-5"><div className="h-6 w-44 rounded bg-muted" /></section>;
  if (error || !plan) return <section aria-label="Detalhes do plano" className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm"><RefreshCw size={16} />Tentar novamente</button></section>;
  return <section aria-labelledby="plan-title" className="rounded-xl border bg-card p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seu plano</p><h2 id="plan-title" className="mt-1 text-xl font-semibold">{plan.name}</h2><p className="mt-1 text-sm text-muted-foreground">Configuração contratada · versão {plan.version}</p></div><div className="text-left sm:text-right"><p className="text-lg font-semibold">{money(plan.monthlyPrice,plan.currency)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p><p className="text-xs text-muted-foreground">Setup: {money(plan.setupPrice,plan.currency)}</p></div></div><dl className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(plan.features).map(([key,value]) => <div key={key} className="flex min-h-11 items-center gap-2 rounded-lg bg-muted/45 px-3 py-2 text-sm">{typeof value === 'boolean' ? value ? <Check className="text-primary" size={16} /> : <Minus className="text-muted-foreground" size={16} /> : null}<dt className="text-muted-foreground">{labels[key] ?? key.replace(/_/g,' ')}</dt><dd className="ml-auto font-semibold tabular-nums">{typeof value === 'boolean' ? value ? 'Incluído' : 'Não incluído' : value.toLocaleString('pt-BR')}</dd></div>)}</dl><p className="mt-4 text-xs text-muted-foreground">Esta página é somente para consulta. Alterações de catálogo são restritas ao Super Admin SAIPH.</p></section>;
}
