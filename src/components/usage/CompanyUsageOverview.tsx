import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, RefreshCw, Sparkles } from 'lucide-react';
import { usageService } from '@/services/usage/usageService';
import type { CompanyUsageDashboard } from '@/services/usage/usageService';

const number = new Intl.NumberFormat('pt-BR');

export default function CompanyUsageOverview() {
  const [data,setData] = useState<CompanyUsageDashboard | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await usageService.companyDashboard()); }
    catch { setError('O resumo de franquia ainda não está disponível nesta instalação.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(() => { void load(); },[load]);
  const currentAlert = useMemo(() => data?.alerts.filter(alert => alert.reached).at(-1) ?? null,[data]);

  if (loading) return <section aria-label="Franquia de IA" aria-busy="true" className="grid min-h-36 animate-pulse rounded-xl border bg-card p-5"><span className="sr-only">Carregando franquia…</span><div className="h-6 w-48 rounded bg-muted" /><div className="mt-5 h-3 rounded bg-muted" /></section>;
  if (error || !data) return <section aria-label="Franquia de IA" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Plano e franquia</h2><p className="mt-1 text-sm text-muted-foreground">{error}</p></div><button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RefreshCw size={16} />Tentar novamente</button></section>;

  const progress = Math.min(100,data.percentage);
  return <section aria-labelledby="usage-title" className="rounded-xl border bg-card p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano atual</p><h2 id="usage-title" className="mt-1 text-xl font-semibold">{data.plan}</h2></div><div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles size={16} />Atendimentos IA</div></div>
    <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]"><div><div className="flex items-end justify-between gap-3"><p className="text-2xl font-semibold tabular-nums">{number.format(data.aiAttendances.used)} <span className="text-base font-normal text-muted-foreground">/ {number.format(data.aiAttendances.limit)}</span></p><p className="text-lg font-semibold tabular-nums">{data.percentage}%</p></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Uso da franquia de atendimentos IA" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className={`h-full rounded-full ${currentAlert?.severity === 'critical' ? 'bg-destructive' : currentAlert ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Alertas em 80% e 100%</span><span>{data.aiAttendances.overage > 0 ? `${number.format(data.aiAttendances.overage)} excedentes registrados` : 'Sem excedente'}</span></div></div>
      <div className="flex min-w-52 items-center gap-3 rounded-lg bg-muted/50 p-4"><CalendarClock className="text-muted-foreground" size={20} /><div><p className="text-xs text-muted-foreground">Próxima renovação</p><p className="mt-1 text-sm font-semibold">{new Date(data.renewalAt).toLocaleDateString('pt-BR')}</p></div></div></div>
    {currentAlert && <div role="status" className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${currentAlert.severity === 'critical' ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200'}`}><AlertTriangle className="mt-0.5 shrink-0" size={17} /><p>{currentAlert.threshold === 100 ? 'A franquia foi atingida. O excedente será apenas registrado; não há cobrança automática no MVP.' : 'A empresa atingiu 80% da franquia de atendimentos IA.'}</p></div>}
  </section>;
}
