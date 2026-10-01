import { useEffect,useMemo,useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle,CheckCircle2,ClipboardList,LoaderCircle,Save,ShieldCheck,Sparkles,XCircle } from 'lucide-react';
import { briefingService } from '@/services/briefing/briefingService';
import type { AgentSuggestion,Briefing,BriefingContent } from '@/services/briefing/briefingService';

const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const empty:BriefingContent={
  companyData:{ name:'',description:'' },site:null,instagram:null,address:'',
  businessHours:{ timezone:'America/Sao_Paulo',windows:[{ days:[1,2,3,4,5],start:'08:00',end:'18:00' }] },
  services:[],products:[],allowedPrices:[],team:[],professionals:[],faqs:[],toneOfVoice:'',restrictions:[],handoffRules:[],
  paymentMethods:[],insurancePlans:[],pipelineStages:[],serviceObjective:'',additionalMaterials:[],
};
const lines=(value:string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const asLines=(value:string[] | undefined) => (value ?? []).join('\n');

function Field({ label,children,hint }:{ label:string;children:React.ReactNode;hint?:string }) {
  return <label className="space-y-1.5 text-sm font-medium"><span>{label}</span>{children}{hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}</label>;
}
const inputClass='min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const areaClass=`${inputClass} min-h-24 resize-y`;

export default function ImplementationBriefingPage() {
  const [briefing,setBriefing]=useState<Briefing | null>(null); const [suggestion,setSuggestion]=useState<AgentSuggestion | null>(null);
  const [form,setForm]=useState<BriefingContent>(empty); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [reviewReason,setReviewReason]=useState('');
  const window=form.businessHours.windows[0];
  const readonly=briefing?.status === 'COMPLETED';
  const progress=useMemo(() => {
    const values=[form.companyData.name,form.address,window,form.services.length + form.products.length,form.toneOfVoice,
      form.restrictions.length,form.handoffRules.length,form.paymentMethods.length,form.pipelineStages.length,form.serviceObjective];
    return values.filter(Boolean).length;
  },[form,window]);

  useEffect(() => { void (async () => {
    try { const result=await briefingService.get(); setBriefing(result.briefing); setSuggestion(result.suggestion);
      if (result.briefing) setForm(current => ({ ...current,...result.briefing?.content,
        companyData:{ ...current.companyData,...result.briefing?.content.companyData },
        businessHours:result.briefing?.content.businessHours ?? current.businessHours }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao carregar briefing.'); }
    finally { setLoading(false); }
  })(); },[]);

  function set<K extends keyof BriefingContent>(key:K,value:BriefingContent[K]) { setForm(current => ({ ...current,[key]:value })); setNotice(''); }
  function toggleDay(day:number) { set('businessHours',{ ...form.businessHours,windows:[{ ...window,days:window.days.includes(day)
    ? window.days.filter(value => value !== day) : [...window.days,day].sort() }] }); }
  function hydrate(next:{ briefing:Briefing;suggestion?:AgentSuggestion }) { setBriefing(next.briefing); if (next.suggestion) setSuggestion(next.suggestion); }

  async function saveDraft() {
    setSaving(true); setError(''); setNotice('');
    try { const result=await briefingService.saveDraft({ briefingId:briefing?.id ?? null,expectedVersion:briefing?.version ?? null,content:form });
      setBriefing(result); setNotice('Rascunho salvo. Você pode continuar depois.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao salvar rascunho.'); }
    finally { setSaving(false); }
  }
  async function complete(event:FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      let current=briefing;
      if (!current) current=await briefingService.saveDraft({ briefingId:null,expectedVersion:null,content:form });
      else current=await briefingService.saveDraft({ briefingId:current.id,expectedVersion:current.version,content:form });
      const result=await briefingService.complete(current.id,current.version); hydrate(result);
      setNotice('Briefing concluído. A sugestão aguarda revisão administrativa e o agente continua desativado.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao concluir briefing.'); }
    finally { setSaving(false); }
  }
  async function review(decision:'APPROVED' | 'REJECTED') {
    if (!suggestion) return; setSaving(true); setError(''); setNotice('');
    try { const result=await briefingService.review(suggestion.id,decision,reviewReason,suggestion.version); setSuggestion(result);
      setNotice(decision === 'APPROVED' ? 'Sugestão aprovada para uso futuro. O agente não foi ativado.' : 'Sugestão rejeitada para revisão futura.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao revisar sugestão.'); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="grid min-h-[50vh] place-items-center" aria-busy="true"><LoaderCircle className="animate-spin" aria-label="Carregando briefing" /></main>;
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8" aria-labelledby="briefing-title">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">Implantação <span aria-hidden="true">/</span> Briefing</p>
      <h1 id="briefing-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Briefing de implantação</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Organize informações da empresa para preparar uma sugestão inicial do agente. Salve como rascunho e retome quando precisar.</p>
    </div><div className="rounded-lg border bg-card px-4 py-3 text-sm"><strong>{progress}/10</strong> blocos essenciais preenchidos</div></header>

    <section className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm" role="status">
      <ShieldCheck className="mt-0.5 shrink-0" size={19} /><div><strong>Revisão humana obrigatória.</strong>
      <p className="mt-1 text-muted-foreground">Concluir gera somente uma sugestão em revisão. Nem a conclusão nem a aprovação ativam o agente automaticamente.</p></div>
    </section>
    {error && <section className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm" role="alert"><AlertCircle className="shrink-0" size={18} />{error}</section>}
    {notice && <section className="flex gap-2 rounded-lg border border-success/40 bg-success/10 p-4 text-sm" role="status"><CheckCircle2 className="shrink-0" size={18} />{notice}</section>}

    <form onSubmit={complete} className="space-y-6">
      <fieldset disabled={readonly || saving} className="space-y-6 disabled:opacity-70">
        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"><div className="flex items-center gap-2"><ClipboardList size={19} /><h2 className="font-semibold">Empresa e presença</h2></div>
          <div className="grid gap-4 md:grid-cols-2"><Field label="Dados da empresa — nome"><input className={inputClass} value={form.companyData.name} onChange={event => set('companyData',{ ...form.companyData,name:event.target.value })} /></Field>
          <Field label="Site"><input className={inputClass} type="url" value={form.site ?? ''} onChange={event => set('site',event.target.value || null)} placeholder="https://" /></Field>
          <Field label="Instagram"><input className={inputClass} value={form.instagram ?? ''} onChange={event => set('instagram',event.target.value || null)} placeholder="@empresa" /></Field>
          <Field label="Endereço"><input className={inputClass} value={form.address} onChange={event => set('address',event.target.value)} /></Field></div>
          <Field label="Dados da empresa — descrição"><textarea className={areaClass} value={form.companyData.description} onChange={event => set('companyData',{ ...form.companyData,description:event.target.value })} /></Field>
          <div className="grid gap-4 md:grid-cols-3"><Field label="Fuso horário"><input className={inputClass} value={form.businessHours.timezone} onChange={event => set('businessHours',{ ...form.businessHours,timezone:event.target.value })} /></Field>
          <Field label="Horários — início"><input className={inputClass} type="time" value={window.start} onChange={event => set('businessHours',{ ...form.businessHours,windows:[{ ...window,start:event.target.value }] })} /></Field>
          <Field label="Horários — fim"><input className={inputClass} type="time" value={window.end} onChange={event => set('businessHours',{ ...form.businessHours,windows:[{ ...window,end:event.target.value }] })} /></Field></div>
          <div><span className="text-sm font-medium">Dias de atendimento</span><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((label,day) => <button key={label} type="button" aria-pressed={window.days.includes(day)} onClick={() => toggleDay(day)} className={`min-h-10 rounded-md border px-3 text-sm ${window.days.includes(day) ? 'border-primary bg-primary text-primary-foreground' : ''}`}>{label}</button>)}</div></div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"><h2 className="font-semibold">Oferta, pessoas e conhecimento</h2>
          <div className="grid gap-4 md:grid-cols-2">{([
            ['Serviços','services'],['Produtos','products'],['Preços permitidos','allowedPrices'],['Equipe','team'],['Profissionais','professionals'],
            ['Formas de pagamento','paymentMethods'],['Convênios','insurancePlans'],['Materiais adicionais','additionalMaterials'],
          ] as Array<[string,keyof BriefingContent]>).map(([label,key]) => <Field key={key} label={label} hint="Um item por linha"><textarea className={areaClass} value={asLines(form[key] as string[])} onChange={event => set(key,lines(event.target.value) as never)} /></Field>)}</div>
          <Field label="Perguntas frequentes" hint="Uma por linha no formato: Pergunta | Resposta"><textarea className={areaClass} value={form.faqs.map(item => `${item.question} | ${item.answer}`).join('\n')} onChange={event => set('faqs',lines(event.target.value).map(item => { const [question,...answer]=item.split('|'); return { question:question.trim(),answer:answer.join('|').trim() }; }).filter(item => item.question && item.answer))} /></Field>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"><h2 className="font-semibold">Comportamento e processo</h2>
          <div className="grid gap-4 md:grid-cols-2"><Field label="Tom de voz"><textarea className={areaClass} value={form.toneOfVoice} onChange={event => set('toneOfVoice',event.target.value)} /></Field>
          <Field label="Objetivo do atendimento"><textarea className={areaClass} value={form.serviceObjective} onChange={event => set('serviceObjective',event.target.value)} /></Field>
          <Field label="Restrições" hint="Um item por linha"><textarea className={areaClass} value={asLines(form.restrictions)} onChange={event => set('restrictions',lines(event.target.value))} /></Field>
          <Field label="Quando transferir" hint="Um item por linha"><textarea className={areaClass} value={asLines(form.handoffRules)} onChange={event => set('handoffRules',lines(event.target.value))} /></Field></div>
          <Field label="Etapas do funil" hint="Uma etapa por linha"><textarea className={areaClass} value={asLines(form.pipelineStages)} onChange={event => set('pipelineStages',lines(event.target.value))} /></Field>
        </section>
      </fieldset>
      {!readonly && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => void saveDraft()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium disabled:opacity-50"><Save size={17} />Salvar rascunho</button>
      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Sparkles size={17} />Concluir e gerar sugestão</button></div>}
    </form>

    {suggestion && <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="suggestion-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="suggestion-title" className="font-semibold">Sugestão inicial do agente</h2><p className="mt-1 text-sm text-muted-foreground">Status: {suggestion.status === 'PENDING_REVIEW' ? 'Aguardando revisão' : suggestion.status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'}</p></div><span className="rounded-full border px-3 py-1 text-xs font-semibold">Agente não ativado</span></div>
      <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm md:grid-cols-2"><p><strong>Nome:</strong> {suggestion.configuration.behaviorConfiguration.name}</p><p><strong>Tom:</strong> {suggestion.configuration.behaviorConfiguration.toneOfVoice}</p><p className="md:col-span-2"><strong>Objetivo:</strong> {suggestion.configuration.behaviorConfiguration.objective}</p><p><strong>Pode responder:</strong> {suggestion.configuration.behaviorConfiguration.canAnswer.join('; ')}</p><p><strong>Não pode responder:</strong> {suggestion.configuration.behaviorConfiguration.cannotAnswer.join('; ')}</p><p className="md:col-span-2"><strong>Transferência:</strong> {suggestion.configuration.behaviorConfiguration.handoffRules.join('; ')}</p></div>
      {suggestion.status === 'PENDING_REVIEW' && <><Field label="Parecer do administrador" hint="Obrigatório, mínimo de 10 caracteres"><textarea className={areaClass} value={reviewReason} onChange={event => setReviewReason(event.target.value)} /></Field><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving || reviewReason.trim().length < 10} onClick={() => void review('REJECTED')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium disabled:opacity-50"><XCircle size={17} />Rejeitar sugestão</button><button type="button" disabled={saving || reviewReason.trim().length < 10} onClick={() => void review('APPROVED')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CheckCircle2 size={17} />Aprovar sugestão</button></div></>}
      <p className="text-xs text-muted-foreground">A aprovação registra somente a revisão. A ativação deve ocorrer em um fluxo separado, depois de salvar/testar a configuração no sandbox.</p>
    </section>}
  </main>;
}
