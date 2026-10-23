import './ContactoCliente.css';
export function numeroContacto(valor) {
  const texto=String(valor || '').trim();
  if(!/^[+\d\s().-]+$/.test(texto)) return '';
  let numero=texto.replace(/\D/g,'');
  if(/^9\d{8}$/.test(numero)) numero='51'+numero;
  return /^[1-9]\d{9,14}$/.test(numero) ? numero : '';
}
export default function ContactoCliente({telefono,nombre,pedido}) {
  const numero=numeroContacto(telefono);
  const mensaje=pedido?.estado === 'Listo'
    ? `Hola ${nombre}, te escribimos de Creativa Impresos. Tu pedido ${pedido.codigo} (${pedido.tipo || 'trabajo'}) ya está listo para recoger. ¡Te esperamos!`
    : `Hola ${nombre}, te escribimos de Creativa Impresos${pedido ? ` por tu pedido ${pedido.codigo}` : ''}.`;
  return <div className="client-contact"><span>{telefono || 'Sin teléfono registrado'}</span>{numero ? <div><a className="contact-whatsapp" href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">{pedido?.estado === 'Listo' ? 'Avisar por WhatsApp ↗' : 'WhatsApp ↗'}</a><a href={`tel:+${numero}`}>Llamar</a></div> : telefono ? <small>Revisa el número y su código de país.</small> : null}</div>;
}
