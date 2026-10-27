import { applyOperation, cashEntries, STAGES, today, validateState } from '../domain/operations.js';
import { initialState } from '../domain/workspace.js';
import { newPreview } from '../domain/preview.js';
import { createSession } from './session.js';
import { sampleDesign } from '../domain/samples.js';

// Solo memoria: no usa el repositorio real, autenticación ni sincronización.
export async function createDemonstration({ files, now = new Date(), newId = () => crypto.randomUUID() }) {
  const date = days => today(new Date(now.getTime() + days * 86400000));
  const state = { ...initialState({ mode: 'standalone', name: 'Equipo Creativa', device: newId(), userId: newId(), now }), demonstration: true };
  const designer = { id: newId(), nombre: 'Lucía · Diseñadora de ejemplo', rol: 'disenador' };
  state.team = [state.profile, designer];
  const generated = new Map(), assets = new Map();
  async function artwork(model, sampleId, revision=2) {
    const key=`${sampleId}:${revision}`;
    if (!generated.has(key)) generated.set(key,await files.demoPreview(model,sampleId,revision));
    return generated.get(key);
  }
  function store(asset) {
    if(!assets.has(asset.hash)){const id=newId();state.files[id]={...asset};assets.set(asset.hash,id);}
    return assets.get(asset.hash);
  }
  const examplesById = new Map();
  const apply = (type, target, payload, day = 0) => {
    const operation = { id: newId(), type, target, payload, at: `${date(day)}T15:00:00-05:00` };
    state.documents = applyOperation(state.documents, operation, state.profile);
    return operation.id;
  };
  const examples = [
    ['María Quispe', 'Invitaciones de boda · Floral', 150, 45000, 0, 0, 'bifold', 'boda-botanica'],
    ['Valeria Mamani', 'Invitaciones de quince años · Dorado', 100, 38000, 1, 1, 'bifold', 'quince-celestial'],
    ['Café Altiplano', 'Tarjetas de presentación · Doble cara', 500, 16000, 2, 0, 'card', 'cafe-altiplano'],
    ['Familia Flores', 'Invitaciones de bautizo · Cielo celeste', 80, 22400, 3, 1, 'bifold', 'bautizo-cielo'],
    ['Óptica Andina', 'Tarjetas de presentación · Brillante', 1000, 26000, 4, -1, 'card', 'optica-andina'],
    ['Promoción Horizonte', 'Invitaciones de graduación · Azul', 200, 64000, 5, 0, 'bifold', 'graduacion-andina'],
    ['María Quispe', 'Invitaciones de aniversario · Trabajo anterior', 60, 18000, 6, -2, 'bifold', 'boda-botanica'],
    ['Feria Los Andes', 'Volantes promocionales · Anulado', 1000, 19000, 0, 2, 'card', 'cafe-altiplano'],
    ['Estudio Luna', 'Tarjetas de presentación · Rosa minimalista', 500, 18500, 1, 2, 'card', 'estudio-luna'],
    ['Dulce Miel', 'Tarjetas de presentación · Repostería artesanal', 300, 13500, 2, 1, 'card', 'dulce-miel'],
    ['María Quispe', 'Invitaciones de boda · Reimpresión botánica', 200, 62000, 3, 3, 'bifold', 'boda-botanica'],
    ['Valeria Mamani', 'Invitaciones de quince años · Azul celestial', 120, 48000, 4, 2, 'bifold', 'quince-celestial'],
    ['Café Altiplano', 'Tarjetas de presentación · Nueva tirada', 1000, 29000, 5, 1, 'card', 'cafe-altiplano'],
    ['Familia Flores', 'Invitaciones de bautizo · Cielo celeste', 100, 29500, 2, 3, 'bifold', 'bautizo-cielo'],
    ['Óptica Andina', 'Tarjetas de presentación · Reposición', 500, 15500, 6, -3, 'card', 'optica-andina'],
    ['Promoción Horizonte', 'Invitaciones de graduación · Edición especial', 250, 78000, 1, 4, 'bifold', 'graduacion-andina'],
    ['Familia Quispe', 'Invitación plana · Botánica', 120, 32000, 1, 2, 'invitation', 'plana-botanica'],
    ['Promoción Horizonte', 'Invitación tríptica envolvente · Graduación', 180, 69000, 1, 3, 'trifold', 'triptico-graduacion'],
    ['María y José', 'Invitación doble puerta · Boda', 150, 72000, 1, 4, 'gatefold', 'doblepuerta-boda'],
  ];
  for (const [index, [client, product, qty, total, stage, delivery, model, sampleId]] of examples.entries()) {
    const id = newId();
    apply('create', id, { client: `${client} · Ejemplo`, phone: '', product, qty, total, received: date(-7), delivery: `${date(delivery)}T18:00`, description: 'ENCARGO FICTICIO PARA PRESENTACIÓN. Revisar textos, sangrado y aprobación del cliente antes de imprimir. Precios ilustrativos.' }, -7);
    apply('assign', id, { assignee: designer.id }, -6);
    if (index !== 0 && index !== 7) {
      const sample=sampleDesign(model,sampleId), panels=await artwork(model,sampleId);
      examplesById.set(id,sample);
      if([1,2].includes(index)) {
        const initial=Object.values(await artwork(model,sampleId,1))[0];
        apply('design',id,{fileId:store(initial),name:`${sample.name} - propuesta inicial.webp`,hash:initial.hash},-5);
      }
      const image=Object.values(panels)[0];
      const designId=apply('design',id,{fileId:store(image),name:`${sample.name} - diseño final.webp`,hash:image.hash},-4);
      const variations=[1,2].includes(index)?['matte',sample.finish==='matte'?'gloss':sample.finish]:[sample.finish];
      for(const finish of variations) {
        const preview=newPreview(model);preview.sourceDesignId=designId;
        preview.appearance.finish=finish;preview.appearance.paper=sample.paper;
        preview.appearance.lighting=sample.motif==='stars'?'studio':'neutral';
        for(const [slot,asset] of Object.entries(panels)) preview.panels[slot]={fileId:store(asset),hash:asset.hash,name:asset.name,fit:'contain',rotation:0,demo:true};
        apply('preview',id,preview,-4);state.schema=3;
      }
      if(stage>=2) apply('approve',id,{designId,customer:`${client} · Ejemplo`},-3);
    }
    for (let step = 1; step <= stage; step++) {
      // El trabajo ya entregado se cobra antes de la entrega.
      if (step === 6) apply('payment', id, { amount: total, method: 'Transferencia' }, -2);
      apply('stage', id, { stage: STAGES[step] }, -2);
    }
    if (stage !== 6) apply('payment', id, { amount: Math.floor(total / 2), method: index % 2 ? 'Yape' : 'Efectivo' });
    apply('cost', id, { amount: Math.floor(total * 0.25), category: 'Material', concept: `${model==='card'?'Cartulina para tarjetas':'Papel para invitaciones'} · costo ilustrativo` });
    if(index>=8) apply('cost',id,{amount:Math.floor(total*0.12),category:'Mano de obra',concept:'Diseño y acabado · costo ilustrativo'});
    if (index === 7) {
      apply('cancel', id, { reason: 'Cancelación de ejemplo, con devolución parcial.' });
      apply('refund', id, { paymentId: state.documents[id].payments[0].id, amount: 2000, reason: 'Devolución de ejemplo' });
    }
  }
  apply('movement', newId(), { type: 'ingreso', amount: 30000, method: 'Efectivo', concept: 'Fondo de apertura · Ejemplo' });
  apply('movement', newId(), { type: 'egreso', amount: 8500, method: 'Efectivo', concept: 'Compra de insumos · Ejemplo' });
  const previousEntries = cashEntries(state.documents, date(-2));
  apply('close', newId(), { date: date(-2), counted: previousEntries.filter(e => e.method === 'Efectivo').reduce((n, e) => n + e.amount, 0) }, -2);
  state.draft = { ...state.draft, client: 'Cliente de demostración', product: 'Invitaciones personalizadas', qty: '100', price: '350', description: 'Ejemplo editable: completa el pedido y prueba el flujo.' };
  state.assistantData = { version: 1, ownerId: state.profile.id, ownerRole:state.profile.rol, revision: 1,
    manuals: [{ id: newId(), title: 'Procedimiento de ejemplo · Revisión de invitaciones', pages: [{ number: 1, text: 'Procedimiento ilustrativo: compara los nombres, la fecha y el texto con la referencia del cliente. Registra la aprobación de la última versión del archivo antes de pasar a impresión. Comprueba el sangrado y los perfiles de color en Corel. La vista 3D es una simulación y no sustituye la aprobación del archivo de impresión.' }] }],
    visualIndex: Object.values(state.documents).filter(order=>order.kind==='order'&&order.previews?.length).map(order=>{
      const sample=examplesById.get(order.id);
      return {orderId:order.id,designId:order.designs.at(-1).id,hash:order.designs.at(-1).hash,
        description:`${sample.name}: ${sample.tags.join(', ')}. Diseño ficticio para presentación.`,tags:sample.tags};
    }) };
  validateState(state);
  const session = createSession({ opened: { state }, repository: { save: async (opened, next) => ({ ...opened, state: next }) }, release() {} });
  return { ...session, backup: async () => { throw new Error('La demostración es temporal. Sal de ella para respaldar tus datos reales.'); } };
}
