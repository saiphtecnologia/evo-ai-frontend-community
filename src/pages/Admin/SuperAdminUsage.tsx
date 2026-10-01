import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { usageService } from '@/services/usage/usageService';
import type { AdminUsageRow } from '@/services/usage/usageService';

const integer = new Intl.NumberFormat('pt-BR');
const cost = (row: AdminUsageRow) => new Intl.NumberFormat('pt-BR',{ style: 'currency', currency: row.currency }).format(row.estimatedCostMicrounits / 1_000_000);

export default function SuperAdminUsagePage() {
  const [rows,setRows] = useState<AdminUsageRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [search,setSearch] = useState('');
  const [alert,setAlert] = useState<'all' | '80' | '100'>('all');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await usageService.adminDashboard({ search,alert,page: 1,pageSize: 100 })).rows); }
    catch { setError('A API do dashboard SAIPH ainda não está disponível nesta instalação.'); }
    finally { setLoading(false); }
  },[alert,search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(),250); return () => window.clearTimeout(timer); },[load]);

  return <section aria-labelledby="admin-usage-title" className="space-y-5"><header><p className="text-sm font-medium text-muted-foreground">SAIPH Super Admin</p><h1 id="admin-usage-title" className="mt-1 text-2xl font-semibold">Franquia por empresa</h1><p className="mt-2 text-sm text-muted-foreground">Uso do ciclo atual. Excedentes são registrados sem cobrança automática.</p></header>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Buscar empresa</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar empresa" maxLength={120} className="min-h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><label className="text-sm"><span className="sr-only">Filtrar alerta</span><select value={alert} onChange={event => setAlert(event.target.value as 'all' | '80' | '100')} className="min-h-10 rounded-md border bg-background px-3"><option value="all">Todos os níveis</option><option value="80">80% ou mais</option><option value="100">100% ou mais</option></select></label><button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium"><RefreshCw size={16} />Atualizar</button></div>
    {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3 text-right">Limite</th><th className="px-4 py-3 text-right">Uso</th><th className="px-4 py-3 text-right">Excedente</th><th className="px-4 py-3 text-right">Tokens</th><th className="px-4 py-3 text-right">Custo estimado</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando franquias…</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhuma empresa encontrada.</td></tr> : rows.map(row => <tr key={row.companyId}><td className="px-4 py-3 font-medium"><span className="flex items-center gap-2">{row.alert && <AlertTriangle aria-label={`Alerta de ${row.alert}%`} size={16} className={row.alert === 100 ? 'text-destructive' : 'text-amber-500'} />}{row.company}</span></td><td className="px-4 py-3">{row.plan}</td><td className="px-4 py-3 text-right tabular-nums">{integer.format(row.limit)}</td><td className="px-4 py-3 text-right tabular-nums">{integer.format(row.usage)}</td><td className={`px-4 py-3 text-right tabular-nums ${row.overage ? 'font-semibold text-destructive' : ''}`}>{integer.format(row.overage)}</td><td className="px-4 py-3 text-right tabular-nums">{integer.format(row.tokens)}</td><td className="px-4 py-3 text-right tabular-nums">{cost(row)}</td></tr>)}</tbody></table></div>
  </section>;
}
