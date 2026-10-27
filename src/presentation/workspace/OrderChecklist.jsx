import { hasCurrentApproval, printBlockers } from '../../domain/production.js';

export default function OrderChecklist({ order, onNavigate }) {
  const active=!order.cancelled&&order.stage!=='Entregado';
  const blockers=active?printBlockers(order):[];
  return <details className="w-order-checklist">
    <summary>Revisar requisitos de impresión</summary>
    <div aria-label="Revisión de impresión">
      {!active?<p>{order.cancelled?'Este pedido está anulado.':'La entrega de este pedido ya está registrada.'}</p>
        :blockers.length?<ul>{blockers.map(reason=><li key={reason}>{reason}</li>)}</ul>
          :<p>La última versión tiene aprobación registrada. Comprueba el papel, los materiales y la máquina antes de imprimir.</p>}
      {active&&<div className="w-checklist-actions">
        {(!order.designs.length||!hasCurrentApproval(order))&&<button type="button" onClick={()=>onNavigate('Diseños',order.designs.length?'design-approval':'design-upload')}>Ir a Diseños</button>}
        {(order.stage==='Recepción'||!blockers.length)&&<button type="button" onClick={()=>onNavigate('Producción','production-stage')}>Ir a Producción</button>}
      </div>}
      {active&&<small>Esta revisión utiliza los datos registrados en el pedido.</small>}
    </div>
  </details>;
}
