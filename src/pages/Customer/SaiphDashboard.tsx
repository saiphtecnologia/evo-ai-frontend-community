import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Bot, BriefcaseBusiness, Gauge, Headphones, MessageSquare, Percent, RefreshCw,
  Smartphone, TrendingUp, Users,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { BaseHeader, ErrorState, LoadingState } from '@/components/base';
import { dashboardService, type CompanyDashboard, type DashboardPeriod } from '@/services/dashboard/dashboardService';

const number = new Intl.NumberFormat('pt-BR');
const periods: Array<{ key: DashboardPeriod; label: string }> = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
];

function currency(valueMinor: number, code: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(valueMinor / 100);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  emphasis?: boolean;
};

function MetricCard({ label, value, detail, icon: Icon, emphasis = false }: MetricCardProps) {
  return <Card className={emphasis ? 'saiph-card-emphasis h-full' : 'h-full'}>
    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
      <div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{value}</CardTitle></div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
    </CardHeader>
    <CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent>
  </Card>;
}

function LeadsChart({ data }: { data: CompanyDashboard['leadsByPeriod'] }) {
  const max = Math.max(1, ...data.map(item => item.count));
  const labelInterval = Math.max(1, Math.ceil(data.length / 6));
  return <Card className="h-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" />Leads por período</CardTitle>
      <CardDescription>Novos leads por dia no intervalo selecionado.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto" role="group" aria-label="Gráfico de novos leads por dia">
        <ol className="flex h-60 min-w-[38rem] items-end gap-1 border-b border-border px-1 pt-4">
          {data.map((item, index) => <li key={item.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <span className="sr-only">{dateLabel(item.date)}: {number.format(item.count)} leads</span>
            <div className="group relative flex flex-1 items-end" aria-hidden="true">
              <div className="w-full rounded-t bg-primary transition-[height] duration-200 motion-reduce:transition-none" style={{ height: `${item.count === 0 ? 2 : Math.max(8, (item.count / max) * 100)}%` }}>
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow group-hover:block">{item.count}</span>
              </div>
            </div>
            <span aria-hidden="true" className="h-5 truncate text-center text-[10px] text-muted-foreground">
              {index % labelInterval === 0 || index === data.length - 1 ? dateLabel(item.date) : ''}
            </span>
          </li>)}
        </ol>
      </div>
    </CardContent>
  </Card>;
}

function PipelineSummary({ pipeline }: { pipeline: CompanyDashboard['pipeline'] }) {
  const max = Math.max(1, ...pipeline.stages.map(stage => stage.count));
  return <Card className="h-full">
    <CardHeader>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><CardTitle className="flex items-center gap-2 text-lg"><BriefcaseBusiness className="h-5 w-5 text-primary" />Pipeline resumido</CardTitle><CardDescription className="mt-1">Distribuição atual das oportunidades.</CardDescription></div>
        <div className="text-left sm:text-right"><p className="text-2xl font-semibold tabular-nums">{number.format(pipeline.totalOpportunities)}</p><p className="text-xs text-muted-foreground">{currency(pipeline.totalValueMinor, pipeline.currency)}</p></div>
      </div>
    </CardHeader>
    <CardContent>
      {pipeline.stages.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Nenhuma oportunidade no pipeline.</p> : <ol className="space-y-4">
        {pipeline.stages.map(stage => <li key={stage.id}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{stage.name}</span><span className="shrink-0 tabular-nums text-muted-foreground">{number.format(stage.count)} · {currency(stage.valueMinor, pipeline.currency)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${stage.name}: ${stage.count} oportunidades`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={stage.count}><div className="h-full rounded-full bg-chart-2" style={{ width: `${(stage.count / max) * 100}%` }} /></div>
        </li>)}
      </ol>}
    </CardContent>
  </Card>;
}

export default function SaiphDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d');
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await dashboardService.get(period)); }
    catch { setError('O dashboard da empresa ainda não está disponível nesta instalação.'); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { void load(); }, [load]);
  const latest = useMemo(() => data ? new Date(data.generatedAt).toLocaleString('pt-BR') : '', [data]);
  const periodChanged = data?.period.key !== period;

  if (loading && (!data || periodChanged)) return <main className="saiph-page"><LoadingState label="Carregando dashboard…" description="Organizando os indicadores da empresa ativa." /></main>;
  if (error && (!data || periodChanged)) return <main className="saiph-page"><ErrorState title="Não foi possível carregar o dashboard" description={error} retryLabel="Tentar novamente" onRetry={() => void load()} /></main>;
  if (!data) return null;

  const usageProgress = Math.min(100, data.planUsage.percentage);
  return <main className="saiph-page space-y-6">
    <BaseHeader title="Dashboard" subtitle="Visão rápida da operação, pipeline e uso do plano." secondaryActions={[{ label: loading ? 'Atualizando…' : 'Atualizar', icon: <RefreshCw className="h-4 w-4" />, onClick: () => void load(), disabled: loading }]} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex w-fit rounded-lg border bg-card p-1" aria-label="Período do gráfico">
        {periods.map(option => <Button key={option.key} type="button" size="sm" variant={period === option.key ? 'default' : 'ghost'} aria-pressed={period === option.key} onClick={() => setPeriod(option.key)}>{option.label}</Button>)}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">Atualizado em {latest}</p>
    </div>
    {error && <div role="status" className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">Não foi possível atualizar agora. Exibindo a última leitura disponível.</div>}

    <section aria-labelledby="main-cards-title" className="space-y-3">
      <div><h2 id="main-cards-title" className="text-lg font-semibold">Resumo do mês</h2><p className="text-sm text-muted-foreground">Contadores do mês calendário em UTC e franquia do ciclo atual.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leads no mês" value={number.format(data.cards.leadsThisMonth)} detail="Novos leads criados" icon={Users} emphasis />
        <MetricCard label="Conversas no mês" value={number.format(data.cards.conversationsThisMonth)} detail="Conversas iniciadas" icon={MessageSquare} emphasis />
        <MetricCard label="IA utilizada" value={`${number.format(data.cards.aiUsed)} / ${number.format(data.planUsage.limit)}`} detail={`${data.planUsage.percentage}% da franquia · plano ${data.planUsage.plan}`} icon={Bot} emphasis />
        <MetricCard label="Franquia restante" value={number.format(data.cards.franchiseRemaining)} detail={data.planUsage.overage > 0 ? `${number.format(data.planUsage.overage)} excedentes registrados` : `Renova em ${new Date(data.planUsage.renewalAt).toLocaleDateString('pt-BR')}`} icon={Gauge} emphasis />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Uso do plano" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usageProgress}><div className="h-full rounded-full bg-primary" style={{ width: `${usageProgress}%` }} /></div>
    </section>

    <section aria-labelledby="operation-title" className="space-y-3">
      <h2 id="operation-title" className="text-lg font-semibold">Operação</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Atendimentos IA" value={number.format(data.metrics.aiAttendances)} detail="No ciclo da franquia" icon={Bot} />
        <MetricCard label="Atendimentos humanos" value={number.format(data.metrics.humanAttendances)} detail="No mês atual" icon={Headphones} />
        <MetricCard label="Oportunidades" value={number.format(data.metrics.opportunities)} detail="Abertas no pipeline" icon={BriefcaseBusiness} />
        <MetricCard label="Conversão" value={`${data.metrics.conversionPercentage.toLocaleString('pt-BR')}%`} detail={`${number.format(data.metrics.convertedLeads)} leads convertidos no mês`} icon={Percent} />
        <MetricCard label="WhatsApps conectados" value={number.format(data.metrics.connectedWhatsApps)} detail="Conexões ativas agora" icon={Smartphone} />
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-2" aria-label="Leads e pipeline">
      <LeadsChart data={data.leadsByPeriod} />
      <PipelineSummary pipeline={data.pipeline} />
    </section>
  </main>;
}
