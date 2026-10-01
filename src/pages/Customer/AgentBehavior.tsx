import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, Bot, Eye, LoaderCircle, Play, Save, Send, ShieldCheck, X } from 'lucide-react';

type ScheduleWindow = { days: number[]; start: string; end: string };
type AgentBehavior = {
  name: string; presentation: string; toneOfVoice: string; objective: string;
  canAnswer: string[]; cannotAnswer: string[]; handoffRules: string[];
  fallbackMessage: string; schedule: { timezone: string; windows: ScheduleWindow[] };
  outOfHoursMessage: string;
};
type AgentRecord = { agentId: string; name: string; version: number; configuration: AgentBehavior };
type BehaviorPreview = {
  title: string; presentation: string; tone: string; objective: string;
  allowedTopics: string[]; blockedTopics: string[]; handoffRules: string[];
  fallbackMessage: string; outOfHoursMessage: string;
};
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const API = '/api/v1/saiph/agent-configurations';
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

async function request<T>(path = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(response.status === 404
    ? 'A API de configuração de agentes ainda não está disponível nesta instalação.'
    : 'Não foi possível concluir a operação. Tente novamente.');
  return response.json() as Promise<T>;
}

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const asLines = (items: string[]) => items.join('\n');

export default function AgentBehaviorPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [configuration, setConfiguration] = useState<AgentBehavior | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<BehaviorPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [testing, setTesting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  const selected = useMemo(() => agents.find(agent => agent.agentId === selectedId), [agents, selectedId]);
  const scheduleWindow = configuration?.schedule.windows[0];

  const load = useCallback(async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await request<{ data: AgentRecord[] }>();
      setAgents(result.data);
      const current = result.data.find(agent => agent.agentId === selectedId) ?? result.data[0];
      setSelectedId(current?.agentId ?? ''); setConfiguration(current?.configuration ?? null); setVersion(current?.version ?? 0);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao carregar agentes.'); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selected) return;
    setConfiguration(selected.configuration); setVersion(selected.version); setPreview(null); setMessages([]);
  }, [selected]);
  useEffect(() => {
    if (!sandboxOpen) return undefined;
    dialogRef.current?.querySelector<HTMLElement>('textarea, button')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !testing) setSandboxOpen(false); };
    document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close);
  }, [sandboxOpen, testing]);

  function update<K extends keyof AgentBehavior>(field: K, value: AgentBehavior[K]) {
    setConfiguration(current => current ? { ...current, [field]: value } : current); setNotice('');
  }
  function updateWindow(patch: Partial<ScheduleWindow>) {
    if (!configuration || !scheduleWindow) return;
    update('schedule', { ...configuration.schedule, windows: [{ ...scheduleWindow, ...patch }] });
  }
  function toggleDay(day: number) {
    if (!scheduleWindow) return;
    updateWindow({ days: scheduleWindow.days.includes(day) ? scheduleWindow.days.filter(value => value !== day) : [...scheduleWindow.days, day].sort() });
  }

  async function refreshPreview() {
    if (!configuration || !selectedId) return;
    setPreviewing(true); setError('');
    try {
      const result = await request<{ data: { behavior: BehaviorPreview } }>(`/${encodeURIComponent(selectedId)}/preview`, {
        method: 'POST', body: JSON.stringify({ configuration }),
      });
      setPreview(result.data.behavior);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao gerar preview.'); }
    finally { setPreviewing(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (!configuration || !selectedId) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await request<{ data: { version: number; configuration: AgentBehavior } }>(`/${encodeURIComponent(selectedId)}`, {
        method: 'PUT', body: JSON.stringify({ configuration, expectedVersion: version }),
      });
      setVersion(result.data.version); setConfiguration(result.data.configuration);
      setAgents(current => current.map(agent => agent.agentId === selectedId ? { ...agent, version: result.data.version, configuration: result.data.configuration } : agent));
      setNotice('Configuração salva com sucesso.'); await refreshPreview();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao salvar.'); }
    finally { setSaving(false); }
  }

  async function sendTest(event: FormEvent) {
    event.preventDefault(); if (!draft.trim() || !configuration || !selectedId) return;
    const next = [...messages, { role: 'user' as const, content: draft.trim() }];
    setMessages(next); setDraft(''); setTesting(true); setError('');
    try {
      const result = await request<{ data: { text: string; sandbox: true; externalDelivery: false } }>(`/${encodeURIComponent(selectedId)}/sandbox`, {
        method: 'POST', body: JSON.stringify({ configuration, messages: next }),
      });
      setMessages(current => [...current, { role: 'assistant', content: result.data.text }]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha no sandbox.'); }
    finally { setTesting(false); }
  }

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8" aria-labelledby="agent-behavior-title">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 text-sm font-medium text-muted-foreground">IA <span aria-hidden="true">/</span> Personalidade</p>
        <h1 id="agent-behavior-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Prompt e personalidade do agente</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Defina comportamento, limites, transferência humana e horários sem misturar dados da empresa, conhecimento, conversa ou ferramentas.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!configuration || previewing} onClick={() => void refreshPreview()} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Eye size={16} />{previewing ? 'Gerando…' : 'Atualizar preview'}</button>
        <button type="button" disabled={!configuration} onClick={() => setSandboxOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Play size={16} />Testar agente</button>
      </div>
    </header>

    {error && <section role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"><AlertCircle className="mt-0.5 shrink-0 text-destructive" size={18} /><div className="flex-1"><p className="font-medium">Não foi possível concluir</p><p className="mt-1 text-muted-foreground">{error}</p></div>{loading && <button type="button" className="rounded-md border px-3 py-2 font-medium" onClick={() => void load()}>Tentar novamente</button>}</section>}
    {notice && <p role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}

    {loading ? <div role="status" className="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={17} />Carregando configuração…</div>
      : !configuration ? <section className="rounded-xl border bg-card px-6 py-14 text-center"><Bot className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">Nenhum agente disponível</h2><p className="mt-1 text-sm text-muted-foreground">Crie um agente antes de configurar sua personalidade.</p></section>
        : <form onSubmit={event => void save(event)} className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="configuration-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="configuration-title" className="text-lg font-semibold">Configuração</h2><p className="mt-1 text-sm text-muted-foreground">Todos os campos são obrigatórios.</p></div>
              <label className="text-sm font-medium">Agente<select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="ml-2 min-h-10 rounded-md border bg-background px-3 font-normal">{agents.map(agent => <option key={agent.agentId} value={agent.agentId}>{agent.name}</option>)}</select></label></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do agente"><input required maxLength={120} value={configuration.name} onChange={event => update('name', event.target.value)} className="control" /></Field>
              <Field label="Tom de voz"><input required maxLength={500} value={configuration.toneOfVoice} onChange={event => update('toneOfVoice', event.target.value)} className="control" /></Field>
            </div>
            <Field label="Apresentação"><textarea required rows={3} maxLength={2000} value={configuration.presentation} onChange={event => update('presentation', event.target.value)} className="control" /></Field>
            <Field label="Objetivo"><textarea required rows={3} maxLength={2000} value={configuration.objective} onChange={event => update('objective', event.target.value)} className="control" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="O que pode responder" hint="Um item por linha"><textarea required rows={5} value={asLines(configuration.canAnswer)} onChange={event => update('canAnswer', lines(event.target.value))} className="control" /></Field>
              <Field label="O que não pode responder" hint="Um item por linha"><textarea required rows={5} value={asLines(configuration.cannotAnswer)} onChange={event => update('cannotAnswer', lines(event.target.value))} className="control" /></Field>
            </div>
            <Field label="Quando transferir para humano" hint="Uma regra por linha"><textarea required rows={4} value={asLines(configuration.handoffRules)} onChange={event => update('handoffRules', lines(event.target.value))} className="control" /></Field>
            <Field label="Mensagem de fallback"><textarea required rows={2} maxLength={1000} value={configuration.fallbackMessage} onChange={event => update('fallbackMessage', event.target.value)} className="control" /></Field>
            <fieldset className="space-y-3 rounded-lg border p-4"><legend className="px-1 text-sm font-semibold">Horários em que a IA responde</legend>
              <div className="flex flex-wrap gap-2">{DAYS.map((day, index) => <button key={day} type="button" aria-pressed={scheduleWindow?.days.includes(index)} onClick={() => toggleDay(index)} className={`min-h-10 rounded-md border px-3 text-sm font-medium ${scheduleWindow?.days.includes(index) ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>{day}</button>)}</div>
              <div className="grid gap-4 sm:grid-cols-3"><Field label="Início"><input type="time" required value={scheduleWindow?.start ?? ''} onChange={event => updateWindow({ start: event.target.value })} className="control" /></Field><Field label="Fim"><input type="time" required value={scheduleWindow?.end ?? ''} onChange={event => updateWindow({ end: event.target.value })} className="control" /></Field><Field label="Fuso horário"><select value={configuration.schedule.timezone} onChange={event => update('schedule', { ...configuration.schedule, timezone: event.target.value })} className="control"><option value="America/Sao_Paulo">Brasília</option><option value="America/Manaus">Manaus</option><option value="America/Belem">Belém</option><option value="America/Fortaleza">Fortaleza</option></select></Field></div>
            </fieldset>
            <Field label="Mensagem fora do horário"><textarea required rows={2} maxLength={1000} value={configuration.outOfHoursMessage} onChange={event => update('outOfHoursMessage', event.target.value)} className="control" /></Field>
            <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save size={16} />{saving ? 'Salvando…' : 'Salvar configuração'}</button></div>
          </section>

          <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 xl:sticky xl:top-6" aria-labelledby="preview-title">
            <div className="flex items-center gap-2"><Eye size={18} className="text-primary" /><h2 id="preview-title" className="font-semibold">Como o agente irá se comportar</h2></div>
            {!preview ? <p className="text-sm text-muted-foreground">Clique em “Atualizar preview” para gerar a prévia pelo mesmo gerador estruturado usado no servidor.</p> : <div className="space-y-4 text-sm"><div><p className="font-medium">{preview.title}</p><p className="mt-1 text-muted-foreground">{preview.presentation}</p></div><Preview label="Tom" value={preview.tone} /><Preview label="Objetivo" value={preview.objective} /><Preview label="Pode responder" value={preview.allowedTopics.join(' · ')} /><Preview label="Não pode responder" value={preview.blockedTopics.join(' · ')} /><Preview label="Transfere quando" value={preview.handoffRules.join(' · ')} /></div>}
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contextos separados</p><ul className="mt-2 space-y-1 text-sm"><li>System policy</li><li>Company context</li><li>Knowledge context</li><li>Conversation context</li><li>Tool definitions</li></ul></div>
          </aside>
        </form>}

    {sandboxOpen && configuration && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !testing) setSandboxOpen(false); }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sandbox-title" className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-xl"><header className="flex items-start justify-between gap-4 border-b p-5"><div><h2 id="sandbox-title" className="text-lg font-semibold">Testar agente</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={16} className="text-emerald-600" />Sandbox isolado: nenhuma mensagem será enviada ao WhatsApp.</p></div><button type="button" onClick={() => setSandboxOpen(false)} disabled={testing} aria-label="Fechar sandbox" className="grid size-9 place-items-center rounded-md hover:bg-muted"><X size={18} /></button></header>
      <div className="min-h-64 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">{messages.length === 0 && <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Digite uma mensagem para simular a conversa. O histórico existe somente neste sandbox.</p>}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}><p className="mb-1 text-xs font-semibold opacity-70">{message.role === 'user' ? 'Você' : configuration.name}</p><p className="whitespace-pre-wrap">{message.content}</p></div>)}{testing && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={16} />Gerando resposta no sandbox…</p>}</div>
      <form onSubmit={event => void sendTest(event)} className="flex gap-2 border-t p-4"><textarea rows={2} required maxLength={32000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Escreva uma mensagem de teste" className="min-h-11 flex-1 resize-none rounded-md border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /><button type="submit" disabled={testing || !draft.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"><Send size={16} /><span className="hidden sm:inline">Enviar no sandbox</span></button></form></section></div>}
  </main>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block text-sm font-medium">{label}{hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}<span className="mt-1.5 block [&_.control]:min-h-10 [&_.control]:w-full [&_.control]:rounded-md [&_.control]:border [&_.control]:bg-background [&_.control]:px-3 [&_.control]:py-2 [&_.control]:font-normal [&_.control]:focus-visible:outline-none [&_.control]:focus-visible:ring-2 [&_.control]:focus-visible:ring-ring">{children}</span></label>;
}
function Preview({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div>; }
