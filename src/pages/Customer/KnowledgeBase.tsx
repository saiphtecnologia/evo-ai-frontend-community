import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, BookOpen, FileText, HelpCircle, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

type KnowledgeDocument = {
  id: string;
  title: string;
  type: 'text' | 'faq' | 'document';
  status: 'pending' | 'processing' | 'ready' | 'failed';
  updatedAt: string;
  error?: string | null;
  chunkCount: number;
};
type KnowledgeBase = { id: string; name: string; documents: KnowledgeDocument[] };

const API = '/api/v1/saiph/knowledge';
const STATUS: Record<KnowledgeDocument['status'], string> = {
  pending: 'Pendente', processing: 'Processando', ready: 'Pronto', failed: 'Falhou',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error(response.status === 404 ? 'A API de conhecimento ainda não está disponível nesta instalação.' : 'Não foi possível concluir a operação. Tente novamente.');
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function KnowledgeBasePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'base' | 'document'>('document');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const selected = bases.find(base => base.id === selectedId) ?? bases[0];

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const result = await request<{ data: KnowledgeBase[] }>('/bases');
      setBases(result.data); setSelectedId(current => current || result.data[0]?.id || '');
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Falha ao carregar bases.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dialogOpen) return undefined;
    const dialog = dialogRef.current;
    const addButton = addButtonRef.current;
    const firstField = dialog?.querySelector<HTMLElement>('input, select, textarea, button');
    firstField?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) { setDialogOpen(false); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (document.activeElement === document.body) addButton?.focus();
    };
  }, [dialogOpen, saving]);

  const documents = useMemo(() => (selected?.documents ?? []).filter(document => document.title.toLocaleLowerCase().includes(filter.toLocaleLowerCase())), [selected, filter]);
  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    setSaving(true); setActionError('');
    try {
      await request(`/bases/${encodeURIComponent(selected.id)}/documents`, { method: 'POST', body: JSON.stringify({ title: form.get('title'), type: form.get('type'), content: form.get('content') }) });
      setDialogOpen(false); await load();
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível adicionar o conteúdo.'); }
    finally { setSaving(false); }
  }
  async function createBase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setActionError('');
    try {
      const result = await request<{ data: KnowledgeBase }>('/bases', { method: 'POST', body: JSON.stringify({ name: form.get('name') }) });
      await load(); setSelectedId(result.data.id); setDialogOpen(false);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível criar a base.'); }
    finally { setSaving(false); }
  }
  async function removeDocument(document: KnowledgeDocument) {
    if (!selected || !window.confirm(`Remover “${document.title}” da base?`)) return;
    setActionError('');
    try { await request(`/bases/${encodeURIComponent(selected.id)}/documents/${encodeURIComponent(document.id)}`, { method: 'DELETE' }); await load(); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível remover o documento.'); }
  }

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8" aria-labelledby="knowledge-title">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 text-sm font-medium text-muted-foreground">IA <span aria-hidden="true">/</span> Base de conhecimento</p>
        <h1 id="knowledge-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Base de conhecimento</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Organize informações confiáveis para orientar as respostas dos seus agentes.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Atualizar documentos"><RefreshCw size={16} /> Atualizar</button>
        <button ref={addButtonRef} type="button" disabled={!selected} aria-haspopup="dialog" onClick={() => { setActionError(''); setDialogOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus size={16} /> Adicionar conteúdo</button>
      </div>
    </header>

    {loadError && <section role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"><AlertCircle className="mt-0.5 shrink-0 text-destructive" size={18} /><div className="flex-1"><p className="font-medium">Não foi possível carregar a base</p><p className="mt-1 text-muted-foreground">{loadError}</p></div><button type="button" className="min-h-9 rounded-md border px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => void load()}>Tentar novamente</button></section>}
    {actionError && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{actionError}</p>}

    <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]" aria-label="Conteúdo da base">
      <aside className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Bases da empresa</h2><button type="button" onClick={() => { setDialogMode('base'); setActionError(''); setDialogOpen(true); }} className="min-h-9 rounded-md px-2 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Nova base</button></div>
        {loading ? <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status"><LoaderCircle className="animate-spin" size={16} /> Carregando bases…</div>
          : bases.length === 0 ? <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">Nenhuma base configurada.</p>
            : <ul className="space-y-1">{bases.map(base => <li key={base.id}><button type="button" onClick={() => setSelectedId(base.id)} aria-current={selected?.id === base.id ? 'page' : undefined} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === base.id ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted'}`}><span className="flex items-center gap-2"><BookOpen size={16} />{base.name}</span></button></li>)}</ul>}
      </aside>

      <div className="min-w-0 rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="font-semibold">{selected?.name ?? 'Documentos'}</h2><p className="mt-1 text-sm text-muted-foreground">{documents.length} {documents.length === 1 ? 'documento' : 'documentos'} · Texto e FAQ</p></div>
          <label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Buscar documentos</span><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Buscar documentos" className="min-h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
        </div>
        {loading ? <div role="status" className="space-y-3 p-5"><span className="sr-only">Carregando documentos…</span><div className="h-12 animate-pulse rounded-md bg-muted" /><div className="h-12 animate-pulse rounded-md bg-muted" /></div>
          : documents.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-muted"><FileText size={20} className="text-muted-foreground" /></div><h3 className="font-medium">{filter ? 'Nenhum resultado' : 'Sua base começa aqui'}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{filter ? 'Tente outro termo de busca.' : 'Adicione textos, perguntas frequentes, serviços, preços, horários e regras.'}</p></div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="px-5 py-3">Documento</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Fragmentos</th><th scope="col" className="px-4 py-3">Atualizado</th><th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th></tr></thead><tbody className="divide-y">{documents.map(document => <tr key={document.id} className="align-top"><td className="px-5 py-4"><div className="flex items-start gap-3"><FileText className="mt-0.5 shrink-0 text-muted-foreground" size={17} /><div><p className="font-medium">{document.title}</p><p className="mt-1 text-xs text-muted-foreground">{document.type === 'faq' ? 'Pergunta frequente' : 'Texto'}</p>{document.error && <p className="mt-1 max-w-xs text-xs text-destructive">{document.error}</p>}</div></div></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${document.status === 'ready' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : document.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>{document.status === 'failed' && <HelpCircle size={13} className="mr-1" />}{STATUS[document.status]}</span></td><td className="px-4 py-4 tabular-nums">{document.chunkCount}</td><td className="px-4 py-4 text-muted-foreground">{new Date(document.updatedAt).toLocaleDateString()}</td><td className="px-4 py-4 text-right"><button type="button" aria-label={`Remover ${document.title}`} onClick={() => void removeDocument(document)} className="inline-grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
      </div>
    </section>

    {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setDialogOpen(false); }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-knowledge-title" className="w-full max-w-xl rounded-xl border bg-background p-5 shadow-xl sm:p-6"><h2 id="add-knowledge-title" className="text-lg font-semibold">{dialogMode === 'base' ? 'Criar base de conhecimento' : 'Adicionar à base'}</h2><p className="mt-1 text-sm text-muted-foreground">O conteúdo fica disponível somente para os agentes desta empresa.</p><form className="mt-5 space-y-4" onSubmit={event => void (dialogMode === 'base' ? createBase(event) : addDocument(event))}>{dialogMode === 'base' ? <label className="block text-sm font-medium">Nome da base<input name="name" required maxLength={120} className="mt-1.5 min-h-10 w-full rounded-md border bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label> : <><label className="block text-sm font-medium">Título<input name="title" required maxLength={200} className="mt-1.5 min-h-10 w-full rounded-md border bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><label className="block text-sm font-medium">Tipo<select name="type" className="mt-1.5 min-h-10 w-full rounded-md border bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="text">Texto</option><option value="faq">Pergunta frequente</option></select></label><label className="block text-sm font-medium">Conteúdo<textarea name="content" required maxLength={200000} rows={8} placeholder="Escreva informações, serviços, preços, horários ou regras…" className="mt-1.5 w-full resize-y rounded-md border bg-background p-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label></>}{actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => setDialogOpen(false)} className="min-h-10 rounded-md border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancelar</button><button type="submit" disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{saving && <LoaderCircle size={16} className="animate-spin" />}{dialogMode === 'base' ? 'Criar base' : 'Salvar conteúdo'}</button></div></form></section></div>}
  </main>;
}
