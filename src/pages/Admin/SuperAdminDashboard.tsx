import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import {
  AlertTriangle, Bot, Building2, CircleDollarSign, Clock3, Power, RefreshCw,
  Search, ShieldAlert, Smartphone, Sparkles, WalletCards,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { BaseHeader, ErrorState, LoadingState } from '@/components/base';
import {
  superAdminDashboardService, type SuperAdminAlertCode, type SuperAdminCompanyStatus,
  type SuperAdminDashboard, type SuperAdminDashboardPeriod,
} from '@/services/admin/superAdminDashboardService';

const integer = new Intl.NumberFormat('pt-BR');
const periods: Array<{ key: SuperAdminDashboardPeriod; label: string }> = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
];
const alertLabels: Record<SuperAdminAlertCode, string> = {
  whatsapp_offline: 'WhatsApp offline',
  usage_above_80: 'Uso acima de 80%',
  usage_above_100: 'Uso acima de 100%',
  ai_recurring_error: 'Erro recorrente IA',
  onboarding_stalled: 'Onboarding parado',
};
const statusLabels: Record<SuperAdminCompanyStatus, string> = {
  active: 'Ativa', onboarding: 'Em onboarding', suspended: 'Suspensa',
};

function money(valueMinor: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(valueMinor / 100);
}

function estimatedCost(valueMicrounits: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(valueMicrounits / 1_000_000);
}

type MetricCardProps = { label: string; value: string; detail: string; icon: ComponentType<{ className?: string }> };
function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return <Card className="h-full"><CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
    <div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{value}</CardTitle></div>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
  </CardHeader><CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function StatusBadge({ status }: { status: SuperAdminCompanyStatus }) {
  const color = status === 'active' ? 'bg-success/10 text-success' : status === 'suspended'
    ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{statusLabels[status]}</span>;
}

export default function SuperAdminDashboardPage() {
  const [period, setPeriod] = useState<SuperAdminDashboardPeriod>('30d');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | SuperAdminCompanyStatus>('all');
  const [alert, setAlert] = useState<'all' | SuperAdminAlertCode>('all');
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++request.current;
    setLoading(true); setError('');
    try {
      const result = await superAdminDashboardService.get({ period, search, status, alert, page: 1, pageSize: 100 });
      if (request.current === requestId) setData(result);
    } catch {
      if (request.current === requestId) setError('A API do dashboard Super Admin ainda não está disponível nesta instalação.');
    } finally {
      if (request.current === requestId) setLoading(false);
    }
  }, [alert, period, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const periodChanged = data?.period.key !== period;
  if (loading && (!data || periodChanged)) return <LoadingState label="Carregando painel Super Admin…" description="Consolidando indicadores das empresas." />;
  if (error && (!data || periodChanged)) return <ErrorState title="Não foi possível carregar o painel" description={error} retryLabel="Tentar novamente" onRetry={() => void load()} />;
  if (!data) return null;

  const updatedAt = new Date(data.generatedAt).toLocaleString('pt-BR');
  return <section aria-labelledby="super-admin-dashboard-title" className="space-y-6">
    <BaseHeader title="Dashboard Super Admin" subtitle="Visão global comercial, operacional e de risco da plataforma SAIPH." secondaryActions={[{
      label: loading ? 'Atualizando…' : 'Atualizar', icon: <RefreshCw className="h-4 w-4" />,
      onClick: () => void load(), disabled: loading,
    }]} />
    <span id="super-admin-dashboard-title" className="sr-only">Dashboard Super Admin</span>

    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="inline-flex w-fit rounded-lg border bg-card p-1" aria-label="Período do painel">
        {periods.map(option => <Button key={option.key} type="button" size="sm" variant={period === option.key ? 'default' : 'ghost'} aria-pressed={period === option.key} onClick={() => setPeriod(option.key)}>{option.label}</Button>)}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">Atualizado em {updatedAt} · períodos em UTC</p>
    </div>
    {error && <div role="status" className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">Não foi possível atualizar agora. Exibindo a última leitura disponível.</div>}

    <section aria-labelledby="companies-summary" className="space-y-3">
      <h2 id="companies-summary" className="text-lg font-semibold">Empresas</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Empresas ativas" value={integer.format(data.summary.companies.active)} detail="Operação liberada e onboarding concluído" icon={Building2} />
        <MetricCard label="Empresas em onboarding" value={integer.format(data.summary.companies.onboarding)} detail="Implantação ainda não chegou a LIVE" icon={Clock3} />
        <MetricCard label="Empresas suspensas" value={integer.format(data.summary.companies.suspended)} detail="Acesso operacional suspenso" icon={Power} />
      </div>
    </section>

    <section aria-labelledby="commercial-summary" className="space-y-3">
      <h2 id="commercial-summary" className="text-lg font-semibold">Comercial</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="MRR manual" value={money(data.summary.commercial.manualMrrMinor, data.summary.commercial.currency)} detail="Soma manual das mensalidades vigentes" icon={CircleDollarSign} />
        <MetricCard label="Setup vendido" value={money(data.summary.commercial.setupSoldMinor, data.summary.commercial.currency)} detail={`Vendas no período de ${data.period.days} dias`} icon={WalletCards} />
        <Card><CardHeader className="pb-2"><CardDescription>Planos</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{integer.format(data.plans.length)}</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{data.plans.map(plan => <span key={plan.name} className="rounded-full bg-muted px-2.5 py-1 text-xs">{plan.name}: <strong>{integer.format(plan.count)}</strong></span>)}</CardContent></Card>
      </div>
    </section>

    <section aria-labelledby="operation-summary" className="space-y-3">
      <h2 id="operation-summary" className="text-lg font-semibold">Operação e IA</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="WhatsApps conectados" value={integer.format(data.summary.whatsApp.connected)} detail="Conexões disponíveis" icon={Smartphone} />
        <MetricCard label="WhatsApps offline" value={integer.format(data.summary.whatsApp.offline)} detail="Conexões que exigem atenção" icon={ShieldAlert} />
        <MetricCard label="Uso total IA" value={integer.format(data.summary.ai.usage)} detail="Unidades comerciais consumidas" icon={Sparkles} />
        <MetricCard label="Custo estimado IA" value={estimatedCost(data.summary.ai.estimatedCostMicrounits, data.summary.ai.currency)} detail="Estimativa técnica, não valor conciliado" icon={CircleDollarSign} />
        <MetricCard label="Atendimentos IA" value={integer.format(data.summary.ai.attendances)} detail={`No período de ${data.period.days} dias`} icon={Bot} />
      </div>
    </section>

    <section aria-labelledby="alerts-title" className="space-y-3">
      <div><h2 id="alerts-title" className="text-lg font-semibold">Alertas</h2><p className="text-sm text-muted-foreground">Sinais priorizados para atuação do time SAIPH.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.alerts.map(item => <Card key={item.code} className={item.severity === 'critical' ? 'border-destructive/40' : 'border-warning/40'}><CardContent className="flex items-center gap-3 p-4"><AlertTriangle className={item.severity === 'critical' ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-warning'} /><div><p className="text-sm font-medium">{alertLabels[item.code]}</p><p className="text-xl font-semibold tabular-nums">{integer.format(item.count)}</p></div></CardContent></Card>)}
      </div>
    </section>

    <section aria-labelledby="companies-table-title" className="space-y-3">
      <div><h2 id="companies-table-title" className="text-lg font-semibold">Empresas e franquia</h2><p className="text-sm text-muted-foreground">Mensalidade manual, consumo atual e saúde do canal.</p></div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative"><span className="sr-only">Buscar empresa</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar empresa" maxLength={120} className="min-h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
        <label><span className="sr-only">Filtrar status</span><select value={status} onChange={event => setStatus(event.target.value as 'all' | SuperAdminCompanyStatus)} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">Todos os status</option><option value="active">Ativas</option><option value="onboarding">Em onboarding</option><option value="suspended">Suspensas</option></select></label>
        <label><span className="sr-only">Filtrar alerta</span><select value={alert} onChange={event => setAlert(event.target.value as 'all' | SuperAdminAlertCode)} className="min-h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">Todos os alertas</option>{Object.entries(alertLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3 text-right">Mensalidade</th><th className="px-4 py-3 text-right">Uso IA</th><th className="px-4 py-3 text-right">Limite</th><th className="px-4 py-3 text-right">Excedente</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">
        {loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Atualizando empresas…</td></tr> : data.rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Nenhuma empresa encontrada.</td></tr> : data.rows.map(row => <tr key={row.companyId}><td className="px-4 py-3 font-medium">{row.company}</td><td className="px-4 py-3">{row.plan}</td><td className="px-4 py-3 text-right tabular-nums">{money(row.monthlyFeeMinor, row.currency)}</td><td className="px-4 py-3 text-right tabular-nums">{integer.format(row.aiUsage)}</td><td className="px-4 py-3 text-right tabular-nums">{integer.format(row.aiLimit)}</td><td className={`px-4 py-3 text-right tabular-nums ${row.aiOverage ? 'font-semibold text-destructive' : ''}`}>{integer.format(row.aiOverage)}</td><td className="px-4 py-3"><span className="text-success">{row.whatsApp.connected} conectado(s)</span><span className="mx-1 text-muted-foreground">·</span><span className={row.whatsApp.offline ? 'font-medium text-destructive' : 'text-muted-foreground'}>{row.whatsApp.offline} offline</span></td><td className="px-4 py-3"><StatusBadge status={row.status} /></td></tr>)}
      </tbody></table></div>
      <p className="text-xs text-muted-foreground">{integer.format(data.pagination.total)} empresa(s) no filtro atual. A tela não executa cobrança automática.</p>
    </section>
  </section>;
}
