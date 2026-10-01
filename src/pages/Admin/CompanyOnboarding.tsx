import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Circle, Loader2, Rocket } from 'lucide-react';
import { onboardingService } from '@/services/onboarding/onboardingService';
import type { OnboardingOptions, OnboardingSession } from '@/services/onboarding/onboardingService';

const steps = ['Dados da empresa','Plano','Segmento/template','Administrador','Equipe','WhatsApp','Agente IA','Base de conhecimento','Pipeline','Revisão'];
const statusLabel = { NOT_STARTED:'Não iniciado',IN_PROGRESS:'Em andamento',WAITING_WHATSAPP:'Aguardando WhatsApp',TESTING:'Em testes',READY:'Pronto',LIVE:'Ativo' } as const;
type FormState = {
  company:{ name:string;slug:string;document:string;timezone:string;locale:string };
  plan:{ planVersionId:string }; template:{ templateId:string };
  administrator:{ fullName:string;email:string };
  team:{ members:Array<{ fullName:string;email:string;role:'MANAGER' | 'AGENT' }> };
  whatsapp:{ connectionMode:'CONNECT_NOW' | 'CONNECT_LATER' | 'SKIP';displayName:string };
  agent:{ name:string;enabled:boolean }; knowledge:{ name:string;createEmpty:boolean };
  pipeline:{ mode:'TEMPLATE' | 'CUSTOM';name:string | null;stages:string[] };
  review:{ confirmed:boolean;notes:string };
};

const initialForm:FormState = {
  company:{ name:'',slug:'',document:'',timezone:'America/Sao_Paulo',locale:'pt-BR' },
  plan:{ planVersionId:'' },template:{ templateId:'' },administrator:{ fullName:'',email:'' },team:{ members:[] },
  whatsapp:{ connectionMode:'CONNECT_LATER',displayName:'Recepção' },agent:{ name:'Assistente virtual',enabled:true },
  knowledge:{ name:'Base inicial',createEmpty:true },pipeline:{ mode:'TEMPLATE',name:null,stages:[] },review:{ confirmed:false,notes:'' },
};

const field = 'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
const storageId = 'saiph.onboarding.id';
const storageRequest = 'saiph.onboarding.request';
const getRequestKey = () => {
  const current=sessionStorage.getItem(storageRequest); if (current) return current;
  const created=`onboarding:${crypto.randomUUID()}`; sessionStorage.setItem(storageRequest,created); return created;
};

export default function CompanyOnboardingPage() {
  const [session,setSession]=useState<OnboardingSession | null>(null);
  const [options,setOptions]=useState<OnboardingOptions>({ plans:[],templates:[] });
  const [form,setForm]=useState<FormState>(initialForm);
  const [step,setStep]=useState(1);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const hydrate=useCallback((value:OnboardingSession) => {
    setSession(value); setStep(value.currentStep);
    setForm(current => ({ ...current,...value.draft } as FormState));
  },[]);
  useEffect(() => { void (async () => { setLoading(true); try {
    const [available,onboarding]=await Promise.all([onboardingService.options(),(async () => {
      const id=sessionStorage.getItem(storageId); if (id) { try { return await onboardingService.get(id); } catch { sessionStorage.removeItem(storageId); } }
      return onboardingService.start(getRequestKey());
    })()]);
    setOptions(available); sessionStorage.setItem(storageId,onboarding.id); hydrate(onboarding);
  } catch { setError('A API de onboarding SAIPH ainda não está disponível nesta instalação.'); } finally { setLoading(false); } })(); },[hydrate]);

  const completed=useMemo(() => new Set(session?.checklist.filter(item => item.completed).map(item => item.number) ?? []),[session]);
  const setSection=<K extends keyof FormState>(key:K,value:FormState[K]) => setForm(current => ({ ...current,[key]:value }));
  const save=async () => {
    if (!session) return; setSaving(true); setError('');
    try { const key=Object.keys(initialForm)[step-1] as keyof FormState; const updated=await onboardingService.saveStep(session.id,step,form[key] as unknown as Record<string,unknown>,session.version); hydrate(updated); setStep(Math.min(10,step+1)); }
    catch { setError('Revise os campos obrigatórios. Se outra sessão editou este onboarding, recarregue a página.'); }
    finally { setSaving(false); }
  };
  const complete=async () => {
    if (!session) return; setSaving(true); setError('');
    try { hydrate(await onboardingService.complete(session.id,`complete:${session.id}`,session.version)); }
    catch { setError('Não foi possível concluir. O progresso foi preservado para nova tentativa segura.'); }
    finally { setSaving(false); }
  };
  const addMember=() => setSection('team',{ members:[...form.team.members,{ fullName:'',email:'',role:'AGENT' }] });
  const content=(() => {
    switch(step) {
      case 1:return <div className="grid gap-4 md:grid-cols-2"><label>Nome da empresa<input className={field} value={form.company.name} onChange={e=>setSection('company',{...form.company,name:e.target.value})}/></label><label>Slug<input className={field} value={form.company.slug} onChange={e=>setSection('company',{...form.company,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}/></label><label>Documento<input className={field} value={form.company.document} onChange={e=>setSection('company',{...form.company,document:e.target.value})}/></label><label>Fuso horário<input className={field} value={form.company.timezone} onChange={e=>setSection('company',{...form.company,timezone:e.target.value})}/></label></div>;
      case 2:return <label>Plano<select className={field} value={form.plan.planVersionId} onChange={e=>setSection('plan',{ planVersionId:e.target.value })}><option value="">Selecione…</option>{options.plans.map(item=><option key={item.id} value={item.id}>{item.name} · v{item.version} · {new Intl.NumberFormat('pt-BR',{style:'currency',currency:item.currency}).format(item.monthlyPrice)}/mês</option>)}</select></label>;
      case 3:return <fieldset className="grid gap-3 md:grid-cols-2"><legend className="sr-only">Template</legend>{options.templates.map(item=><label key={item.id} className={`rounded-xl border p-4 ${form.template.templateId===item.id?'border-primary bg-primary/5':''}`}><input type="radio" name="template" className="mr-2" checked={form.template.templateId===item.id} onChange={()=>setSection('template',{ templateId:item.id })}/><strong>{item.name}</strong><span className="mt-2 block text-sm text-muted-foreground">{item.description}</span></label>)}</fieldset>;
      case 4:return <div className="grid gap-4 md:grid-cols-2"><label>Nome completo<input className={field} value={form.administrator.fullName} onChange={e=>setSection('administrator',{...form.administrator,fullName:e.target.value})}/></label><label>E-mail<input type="email" className={field} value={form.administrator.email} onChange={e=>setSection('administrator',{...form.administrator,email:e.target.value})}/></label><p className="md:col-span-2 text-sm text-muted-foreground">O acesso será criado por convite; nenhuma senha é coletada neste wizard.</p></div>;
      case 5:return <div className="space-y-3">{form.team.members.map((member,index)=><div key={index} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_10rem_auto]"><input aria-label={`Nome da pessoa ${index+1}`} placeholder="Nome" className={field} value={member.fullName} onChange={e=>setSection('team',{members:form.team.members.map((item,i)=>i===index?{...item,fullName:e.target.value}:item)})}/><input aria-label={`E-mail da pessoa ${index+1}`} type="email" placeholder="E-mail" className={field} value={member.email} onChange={e=>setSection('team',{members:form.team.members.map((item,i)=>i===index?{...item,email:e.target.value}:item)})}/><select aria-label={`Papel da pessoa ${index+1}`} className={field} value={member.role} onChange={e=>setSection('team',{members:form.team.members.map((item,i)=>i===index?{...item,role:e.target.value as 'MANAGER'|'AGENT'}:item)})}><option value="MANAGER">Gestor</option><option value="AGENT">Agente</option></select><button type="button" className="rounded-lg border px-3" onClick={()=>setSection('team',{members:form.team.members.filter((_,i)=>i!==index)})}>Remover</button></div>)}<button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={addMember}>Adicionar pessoa</button></div>;
      case 6:return <div className="space-y-4"><label>Nome da conexão<input className={field} value={form.whatsapp.displayName} onChange={e=>setSection('whatsapp',{...form.whatsapp,displayName:e.target.value})}/></label><fieldset className="space-y-2"><legend className="font-medium">Conexão</legend>{[['CONNECT_NOW','Gerar QR ao concluir'],['CONNECT_LATER','Conectar depois'],['SKIP','Não configurar agora']].map(([value,label])=><label key={value} className="block rounded-lg border p-3"><input type="radio" className="mr-2" checked={form.whatsapp.connectionMode===value} onChange={()=>setSection('whatsapp',{...form.whatsapp,connectionMode:value as FormState['whatsapp']['connectionMode']})}/>{label}</label>)}</fieldset><p className="text-sm text-muted-foreground">O onboarding pode permanecer em “Aguardando WhatsApp” até a leitura do QR. O QR não é salvo no navegador.</p></div>;
      case 7:return <div className="space-y-4"><label>Nome do agente<input className={field} value={form.agent.name} onChange={e=>setSection('agent',{...form.agent,name:e.target.value})}/></label><label className="flex items-center gap-2"><input type="checkbox" checked={form.agent.enabled} onChange={e=>setSection('agent',{...form.agent,enabled:e.target.checked})}/>Preparar agente para testes</label><p className="text-sm text-muted-foreground">Ativar aqui não envia mensagens nem configura credenciais de provedor.</p></div>;
      case 8:return <div className="space-y-4"><label>Nome da base<input className={field} value={form.knowledge.name} onChange={e=>setSection('knowledge',{...form.knowledge,name:e.target.value})}/></label><label className="flex items-center gap-2"><input type="checkbox" checked={form.knowledge.createEmpty} onChange={e=>setSection('knowledge',{...form.knowledge,createEmpty:e.target.checked})}/>Criar estrutura vazia</label><p className="text-sm text-muted-foreground">Documentos e conteúdo serão adicionados depois no Data Plane autorizado.</p></div>;
      case 9:return <div className="space-y-4"><label className="block">Origem<select className={field} value={form.pipeline.mode} onChange={e=>setSection('pipeline',e.target.value==='TEMPLATE'?{mode:'TEMPLATE',name:null,stages:[]}:{mode:'CUSTOM',name:'Pipeline comercial',stages:['Novo contato']})}><option value="TEMPLATE">Usar pipeline do template</option><option value="CUSTOM">Personalizar</option></select></label>{form.pipeline.mode==='CUSTOM'&&<><label>Nome<input className={field} value={form.pipeline.name??''} onChange={e=>setSection('pipeline',{...form.pipeline,name:e.target.value})}/></label><label>Etapas, uma por linha<textarea className={`${field} min-h-32 py-3`} value={form.pipeline.stages.join('\n')} onChange={e=>setSection('pipeline',{...form.pipeline,stages:e.target.value.split('\n').filter(Boolean)})}/></label></>}</div>;
      default:return <div className="space-y-4"><dl className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">{steps.slice(0,9).map((label,index)=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{completed.has(index+1)?'Configurado':'Pendente'}</dd></div>)}</dl><label className="flex items-start gap-3 rounded-lg border p-4"><input type="checkbox" checked={form.review.confirmed} onChange={e=>setSection('review',{...form.review,confirmed:e.target.checked})}/><span>Revisei os dados e autorizo iniciar o provisionamento.</span></label><label>Observações<textarea className={`${field} min-h-24 py-3`} value={form.review.notes} onChange={e=>setSection('review',{...form.review,notes:e.target.value})}/></label></div>;
    }
  })();

  if (loading) return <div aria-busy="true" className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="animate-spin"/>Preparando onboarding…</div>;
  return <section aria-labelledby="onboarding-title" className="mx-auto max-w-7xl space-y-5"><header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">Empresas › Nova empresa</p><h1 id="onboarding-title" className="mt-1 text-2xl font-semibold">Onboarding do cliente</h1><p className="mt-2 text-sm text-muted-foreground">Configure a empresa em dez etapas. O progresso fica salvo para retomada.</p></div>{session&&<span className="rounded-full border px-3 py-1 text-xs font-semibold">{statusLabel[session.status]}</span>}</header>{error&&<div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}<div className="grid gap-5 lg:grid-cols-[17rem_1fr]"><aside aria-label="Checklist do onboarding" className="rounded-xl border bg-card p-4"><ol className="space-y-1">{steps.map((label,index)=>{const number=index+1;const done=completed.has(number);return <li key={label}><button type="button" onClick={()=>setStep(number)} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-sm ${step===number?'bg-primary/10 font-semibold text-primary':''}`}>{done?<Check size={17} aria-hidden="true"/>:<Circle size={17} aria-hidden="true"/>}<span>{number}. {label}</span></button></li>;})}</ol></aside><div className="rounded-xl border bg-card p-5 md:p-7"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etapa {step} de 10</p><h2 className="mt-1 text-xl font-semibold">{steps[step-1]}</h2><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{width:`${step*10}%`}}/></div></div>{content}<div className="mt-8 flex flex-wrap justify-between gap-3"><button type="button" disabled={step===1||saving} onClick={()=>setStep(current=>Math.max(1,current-1))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm disabled:opacity-40"><ArrowLeft size={16}/>Voltar</button>{step<10?<button type="button" disabled={saving||!session} onClick={()=>void save()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<ArrowRight size={16}/>}Salvar e continuar</button>:<button type="button" disabled={saving||!session||!form.review.confirmed} onClick={()=>void (completed.has(10)?complete():save())} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<Rocket size={16}/>} {completed.has(10)?'Concluir onboarding':'Salvar revisão'}</button>}</div></div></div>{session&&session.tasks.length>0&&<div className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Checklist de provisionamento</h2><ul className="mt-3 grid gap-2 md:grid-cols-2">{session.tasks.map(task=><li key={task.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span>{task.key.replace(/_/g,' ')}</span><span className="text-xs font-semibold">{task.status}</span></li>)}</ul></div>}</section>;
}
