import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Screen =
  | 'login' | 'dashboard' | 'nuevo-trabajo' | 'trabajos'
  | 'detalle' | 'disenadores' | 'caja' | 'clientes' | 'reportes' | 'config';

type Estado = 'Pendiente' | 'En diseño' | 'Listo' | 'Entregado';
type MovTipo = 'ingreso' | 'egreso';

interface Trabajo {
  id: string;
  cliente: string;
  telefono: string;
  tipo: string;
  descripcion: string;
  fechaRecepcion: string;
  fechaEntrega: string;
  precio: number;
  adelanto: number;
  disenador: string;
  estado: Estado;
  observaciones: string;
  historial: { estado: Estado; fecha: string; usuario: string }[];
}

interface Movimiento {
  id: string; fecha: string; hora: string;
  concepto: string; tipo: MovTipo; monto: number; responsable: string;
}

interface Cliente {
  id: string; nombre: string; telefono: string; trabajosCount: number; deuda: number;
}

// ── Constants & Mock Data ─────────────────────────────────────────────────────
const TIPOS = ['Tarjetas', 'Sublimado', 'Estampado', 'Corte láser', 'Diseño gráfico', 'Banner', 'Otros'];
const DISENADORES = ['Leydy Milagros', 'Angel Quispe', 'Alvis Leonel'];
const TODAY = '2026-09-17';
const GRAD = 'linear-gradient(135deg, #1664A0, #0B93CD)';

const CLIENTES_DATA: Cliente[] = [
  { id: 'C-001', nombre: 'Yudeliza', telefono: '0991234567', trabajosCount: 3, deuda: 25.00 },
  { id: 'C-002', nombre: 'Ferretería YESSY', telefono: '0987654321', trabajosCount: 5, deuda: 30.00 },
  { id: 'C-003', nombre: 'Clínica Salud Total', telefono: '0923456789', trabajosCount: 2, deuda: 120.00 },
  { id: 'C-004', nombre: 'Restaurante La Mesa', telefono: '0956789012', trabajosCount: 8, deuda: 0 },
  { id: 'C-005', nombre: 'Escuela Simón Bolívar', telefono: '0978901234', trabajosCount: 4, deuda: 75.00 },
  { id: 'C-006', nombre: 'Boutique Moda Chic', telefono: '0945678901', trabajosCount: 6, deuda: 45.00 },
];

const INIT_TRABAJOS: Trabajo[] = [
  {
    id: 'T-001', cliente: 'María González', telefono: '0991234567',
    tipo: 'Tarjetas', descripcion: '500 tarjetas de presentación doble cara, papel couché 300g',
    fechaRecepcion: '2026-09-15', fechaEntrega: '2026-09-20',
    precio: 45, adelanto: 20, disenador: 'Leydy Milagros', estado: 'En diseño',
    observaciones: 'Tono cálido, logo enviado por WhatsApp',
    historial: [
      { estado: 'Pendiente', fecha: '15/09 09:30', usuario: 'Recepción' },
      { estado: 'En diseño', fecha: '15/09 14:00', usuario: 'Leydy Milagros' },
    ],
  },
  {
    id: 'T-002', cliente: 'Ferretería YESSY', telefono: '0987654321',
    tipo: 'Sublimado', descripcion: '10 camisetas con logo empresarial en sublimación full color',
    fechaRecepcion: '2026-09-14', fechaEntrega: '2026-09-18',
    precio: 80, adelanto: 50, disenador: 'Angel Quispe', estado: 'Listo',
    observaciones: 'Tallas: 3 M, 4 L, 3 XL',
    historial: [
      { estado: 'Pendiente', fecha: '14/09 10:00', usuario: 'Recepción' },
      { estado: 'En diseño', fecha: '14/09 16:00', usuario: 'Angel Quispe' },
      { estado: 'Listo', fecha: '17/09 11:00', usuario: 'Angel Quispe' },
    ],
  },
  {
    id: 'T-003', cliente: 'Clínica Salud Total', telefono: '0923456789',
    tipo: 'Diseño gráfico', descripcion: 'Diseño de brochure A4 doble cara, 500 unidades',
    fechaRecepcion: '2026-09-16', fechaEntrega: '2026-09-22',
    precio: 120, adelanto: 0, disenador: '', estado: 'Pendiente',
    observaciones: 'Colores corporativos azul y blanco. Logo en vectores',
    historial: [{ estado: 'Pendiente', fecha: '16/09 09:00', usuario: 'Recepción' }],
  },
  {
    id: 'T-004', cliente: 'Restaurante La Mesa', telefono: '0956789012',
    tipo: 'Banner', descripcion: 'Banner publicitario 2×1 metros, lona full color',
    fechaRecepcion: '2026-09-13', fechaEntrega: '2026-09-17',
    precio: 35, adelanto: 35, disenador: 'Miguel Torres', estado: 'Entregado',
    observaciones: 'Bordes reforzados. Instalación no incluida.',
    historial: [
      { estado: 'Pendiente', fecha: '13/09 08:30', usuario: 'Recepción' },
      { estado: 'En diseño', fecha: '13/09 12:00', usuario: 'Miguel Torres' },
      { estado: 'Listo', fecha: '15/09 16:00', usuario: 'Miguel Torres' },
      { estado: 'Entregado', fecha: '17/09 10:30', usuario: 'Recepción' },
    ],
  },
  {
    id: 'T-005', cliente: 'Escuela Simón Bolívar', telefono: '0978901234',
    tipo: 'Estampado', descripcion: '30 camisetas escolares con escudo institucional en vinil termoadhesivo',
    fechaRecepcion: '2026-09-16', fechaEntrega: '2026-09-25',
    precio: 150, adelanto: 75, disenador: 'Leydy Milagros', estado: 'En diseño',
    observaciones: 'Color camiseta: blanco. Logo aprobado por dirección.',
    historial: [
      { estado: 'Pendiente', fecha: '16/09 11:00', usuario: 'Recepción' },
      { estado: 'En diseño', fecha: '16/09 15:00', usuario: 'Carlos Ruiz' },
    ],
  },
  {
    id: 'T-006', cliente: 'Boutique Moda Chic', telefono: '0945678901',
    tipo: 'Corte láser', descripcion: '200 etiquetas en acrílico 3mm, 5×3cm con orificio',
    fechaRecepcion: '2026-09-17', fechaEntrega: '2026-09-19',
    precio: 90, adelanto: 45, disenador: 'Ana López', estado: 'Pendiente',
    observaciones: 'Orificio para colgar. Acabado brillante.',
    historial: [{ estado: 'Pendiente', fecha: '17/09 09:00', usuario: 'Recepción' }],
  },
];

const INIT_MOVIMIENTOS: Movimiento[] = [
  { id: 'M-001', fecha: TODAY, hora: '09:15', concepto: 'Pago trabajo T-004 — Restaurante La Mesa', tipo: 'ingreso', monto: 35, responsable: 'L. Virginia' },
  { id: 'M-002', fecha: TODAY, hora: '10:30', concepto: 'Compra papel couché A4 resma ×10', tipo: 'egreso', monto: 28.50, responsable: 'L. Virginia' },
  { id: 'M-003', fecha: TODAY, hora: '11:00', concepto: 'Adelanto T-006 — Boutique Moda Chic', tipo: 'ingreso', monto: 45, responsable: 'L. Virginia' },
  { id: 'M-004', fecha: TODAY, hora: '14:30', concepto: 'Adelanto T-005 — Escuela Simón Bolívar', tipo: 'ingreso', monto: 75, responsable: 'L. Virginia' },
  { id: 'M-005', fecha: '2026-09-16', hora: '09:00', concepto: 'Compra tinta sublimación Epson', tipo: 'egreso', monto: 42, responsable: 'Carlos Ruiz' },
  { id: 'M-006', fecha: '2026-09-16', hora: '15:00', concepto: 'Pago parcial T-003 — Clínica Salud Total', tipo: 'ingreso', monto: 60, responsable: 'L. Virginia' },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
const estadoBadge: Record<Estado, { bg: string; text: string; dot: string }> = {
  'Pendiente': { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
  'En diseño': { bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Listo': { bg: 'bg-green-50 border border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  'Entregado': { bg: 'bg-gray-100 border border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const fmt = (n: number) => `$${n.toFixed(2)}`;
const now = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1664A0] transition-all bg-white';

// ── Icons ─────────────────────────────────────────────────────────────────────
type P = { className?: string };
type IconFC = (props: P) => React.ReactElement;
const I: Record<string, IconFC> = {
  Home: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  Plus: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  List: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>,
  Users: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  Cash: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
  Palette: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>,
  Chart: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>,
  Settings: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  Eye: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  EyeOff: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>,
  Search: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  WhatsApp: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  Check: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  Clock: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>,
  ChevronRight: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>,
  Back: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  Phone: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
  Edit: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  Upload: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>,
  X: ({ className = 'w-5 h-5' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  PrintShop: ({ className = 'w-6 h-6' }: P) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>,
};

// ── Shared Components ─────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: Estado }) {
  const c = estadoBadge[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {estado}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {title && <h3 className="font-bold text-gray-900 mb-4 text-base">{title}</h3>}
      {children}
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [showPass, setShowPass] = useState(false);
  const [user, setUser] = useState('recepcion');
  const [pass, setPass] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: GRAD }}>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: '#0B93CD', filter: 'blur(80px)', transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20" style={{ background: '#1664A0', filter: 'blur(100px)', transform: 'translate(-30%, 30%)' }} />

      <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg" style={{ background: GRAD }}>
            <I.PrintShop className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creativa Impresos</h1>
          <p className="text-gray-500 mt-1 text-sm">Sistema de gestión interna</p>
        </div>

        <div className="space-y-5">
          <Field label="Usuario o correo electrónico">
            <input
              className={inputCls}
              placeholder="recepcion@creativa.com"
              value={user}
              onChange={e => setUser(e.target.value)}
            />
          </Field>

          <Field label="Contraseña">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className={`${inputCls} pr-12`}
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <I.EyeOff /> : <I.Eye />}
              </button>
            </div>
          </Field>

          <button
            onClick={onLogin}
            className="w-full text-white font-bold text-lg py-4 rounded-2xl transition-all hover:opacity-90 active:scale-95 shadow-lg mt-2"
            style={{ background: GRAD, boxShadow: '0 8px 24px rgba(22,100,160,0.35)' }}
          >
            Ingresar al sistema
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Problemas para acceder? Contacte al administrador.
        </p>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Screen; label: string; Icon: IconFC }[] = [
  { id: 'dashboard', label: 'Inicio', Icon: I.Home },
  { id: 'nuevo-trabajo', label: 'Nuevo trabajo', Icon: I.Plus },
  { id: 'trabajos', label: 'Trabajos', Icon: I.List },
  { id: 'clientes', label: 'Clientes', Icon: I.Users },
  { id: 'caja', label: 'Caja', Icon: I.Cash },
  { id: 'disenadores', label: 'Diseñadores', Icon: I.Palette },
  { id: 'reportes', label: 'Reportes', Icon: I.Chart },
  { id: 'config', label: 'Configuración', Icon: I.Settings },
];

function Sidebar({ current, onNav }: { current: Screen; onNav: (s: Screen) => void }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: GRAD }}>
          <I.PrintShop className="w-6 h-6 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-gray-900 text-sm">Creativa</div>
          <div className="font-bold text-[#0B93CD] text-sm">Impresos</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all font-semibold text-sm ${
                active ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={active ? { background: GRAD } : {}}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: '#1664A0' }}>
            LV
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">L. Virginia</div>
            <div className="text-xs text-gray-400">Recepción</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Bottom Nav (mobile) ───────────────────────────────────────────────────────
const BOTTOM = [
  { id: 'dashboard' as Screen, label: 'Inicio', Icon: I.Home },
  { id: 'trabajos' as Screen, label: 'Trabajos', Icon: I.List },
  { id: 'nuevo-trabajo' as Screen, label: 'Nuevo', Icon: I.Plus },
  { id: 'caja' as Screen, label: 'Caja', Icon: I.Cash },
  { id: 'clientes' as Screen, label: 'Clientes', Icon: I.Users },
];

function BottomNav({ current, onNav }: { current: Screen; onNav: (s: Screen) => void }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-50 safe-area-bottom">
      {BOTTOM.map(({ id, label, Icon }) => {
        const active = current === id;
        const isCenter = id === 'nuevo-trabajo';
        return (
          <button
            key={id}
            onClick={() => onNav(id)}
            className="flex-1 flex flex-col items-center pt-2 pb-3 gap-0.5 transition-all"
          >
            {isCenter ? (
              <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg -mt-5" style={{ background: GRAD }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            ) : (
              <Icon className={`w-5 h-5 ${active ? 'text-[#1664A0]' : 'text-gray-400'}`} />
            )}
            <span className={`text-xs font-semibold ${active ? 'text-[#1664A0]' : 'text-gray-400'} ${isCenter ? 'mt-0.5' : ''}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
      {onBack ? (
        <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-gray-100 transition-all">
          <I.Back className="w-5 h-5 text-gray-600" />
        </button>
      ) : (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: GRAD }}>
          <I.PrintShop className="w-5 h-5 text-white" />
        </div>
      )}
      <h1 className="font-bold text-lg text-gray-900">{title}</h1>
    </header>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({
  trabajos, onNav, onSelectTrabajo,
}: {
  trabajos: Trabajo[];
  onNav: (s: Screen) => void;
  onSelectTrabajo: (id: string) => void;
}) {
  const pendientes = trabajos.filter(t => t.estado === 'Pendiente').length;
  const enDiseno = trabajos.filter(t => t.estado === 'En diseño').length;
  const listos = trabajos.filter(t => t.estado === 'Listo').length;
  const entregados = trabajos.filter(t => t.estado === 'Entregado').length;

  const proximas = [...trabajos]
    .filter(t => t.estado !== 'Entregado')
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))
    .slice(0, 4);

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buenos días, L. Virginia 👋</h1>
        <p className="text-gray-400 mt-1 text-sm">Miércoles 17 de septiembre de 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes', value: pendientes, bg: 'bg-amber-50 border-amber-100', vt: 'text-amber-600', lt: 'text-amber-700' },
          { label: 'En diseño', value: enDiseno, bg: 'bg-blue-50 border-blue-100', vt: 'text-blue-600', lt: 'text-blue-700' },
          { label: 'Listos', value: listos, bg: 'bg-green-50 border-green-100', vt: 'text-green-600', lt: 'text-green-700' },
          { label: 'Entregados', value: entregados, bg: 'bg-gray-50 border-gray-200', vt: 'text-gray-600', lt: 'text-gray-600' },
        ].map(({ label, value, bg, vt, lt }) => (
          <button
            key={label}
            onClick={() => onNav('trabajos')}
            className={`${bg} border rounded-2xl p-4 text-left hover:shadow-md transition-all active:scale-95`}
          >
            <div className={`text-4xl font-bold ${vt}`}>{value}</div>
            <div className={`text-sm font-semibold mt-1 ${lt}`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wide text-xs">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nuevo trabajo', desc: 'Registrar pedido', target: 'nuevo-trabajo' as Screen, icon: <I.Plus className="w-7 h-7 text-white" /> },
            { label: 'Trabajos', desc: 'Ver todos los pedidos', target: 'trabajos' as Screen, icon: <I.List className="w-7 h-7 text-white" /> },
            { label: 'Caja', desc: 'Ingresos y egresos', target: 'caja' as Screen, icon: <I.Cash className="w-7 h-7 text-white" /> },
            { label: 'Clientes', desc: 'Directorio', target: 'clientes' as Screen, icon: <I.Users className="w-7 h-7 text-white" /> },
          ].map(({ label, desc, target, icon }) => (
            <button
              key={label}
              onClick={() => onNav(target)}
              className="rounded-2xl p-5 flex items-center gap-3 text-left hover:opacity-90 active:scale-95 transition-all shadow-sm"
              style={{ background: GRAD }}
            >
              <div className="bg-white/20 rounded-xl p-2 flex-shrink-0">{icon}</div>
              <div>
                <div className="font-bold text-white text-base leading-tight">{label}</div>
                <div className="text-white/70 text-xs mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Próximas entregas */}
      <div>
        <h2 className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wide text-xs">Próximas entregas</h2>
        <div className="space-y-2">
          {proximas.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelectTrabajo(t.id); onNav('detalle'); }}
              className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: GRAD }}>
                {t.id.replace('T-', '#')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 truncate">{t.cliente}</div>
                <div className="text-sm text-gray-400 truncate">{t.tipo}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <EstadoBadge estado={t.estado} />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <I.Clock className="w-3 h-3" />{t.fechaEntrega}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Nuevo Trabajo ─────────────────────────────────────────────────────────────
function NuevoTrabajo({
  onSave, onCancel,
}: {
  onSave: (t: Trabajo) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    cliente: '', telefono: '', tipo: '', descripcion: '',
    fechaRecepcion: TODAY, fechaEntrega: '',
    precio: '', adelanto: '', disenador: '', observaciones: '',
  });
  const [archivo, setArchivo] = useState('');

  const saldo = Math.max(0, (parseFloat(form.precio) || 0) - (parseFloat(form.adelanto) || 0));
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.cliente.trim() || !form.tipo || !form.fechaEntrega) {
      alert('Complete los campos obligatorios: Cliente, Tipo de trabajo y Fecha de entrega.');
      return;
    }
    const t: Trabajo = {
      id: `T-${String(Math.floor(Math.random() * 900) + 100)}`,
      cliente: form.cliente, telefono: form.telefono, tipo: form.tipo,
      descripcion: form.descripcion, fechaRecepcion: form.fechaRecepcion,
      fechaEntrega: form.fechaEntrega, precio: parseFloat(form.precio) || 0,
      adelanto: parseFloat(form.adelanto) || 0, disenador: form.disenador,
      estado: 'Pendiente', observaciones: form.observaciones,
      historial: [{ estado: 'Pendiente', fecha: `${TODAY} ${now()}`, usuario: 'Recepción' }],
    };
    onSave(t);
  };

  return (
    <div className="p-5 lg:p-6 max-w-2xl">
      <div className="hidden lg:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo trabajo</h1>
        <p className="text-gray-400 text-sm mt-1">Complete los datos del pedido</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field label="Cliente *">
            <input className={inputCls} placeholder="Nombre del cliente o empresa" value={form.cliente} onChange={set('cliente')} />
          </Field>
          <Field label="Celular / WhatsApp">
            <input className={inputCls} placeholder="09XXXXXXXX" value={form.telefono} onChange={set('telefono')} />
          </Field>
        </div>

        <Field label="Tipo de trabajo *">
          <select className={inputCls} value={form.tipo} onChange={set('tipo')}>
            <option value="">Seleccione un tipo de trabajo</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Descripción del trabajo">
          <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Detalle del trabajo: cantidad, materiales, acabados..." value={form.descripcion} onChange={set('descripcion')} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de recepción">
            <input type="date" className={inputCls} value={form.fechaRecepcion} onChange={set('fechaRecepcion')} />
          </Field>
          <Field label="Fecha de entrega *">
            <input type="date" className={inputCls} value={form.fechaEntrega} onChange={set('fechaEntrega')} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Precio total ($)">
            <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.precio} onChange={set('precio')} />
          </Field>
          <Field label="Importe pagado / adelanto ($)">
            <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.adelanto} onChange={set('adelanto')} />
            <button
              type="button"
              disabled={!(parseFloat(form.precio) > 0)}
              onClick={() => setForm(f => ({ ...f, adelanto: f.precio }))}
              className="mt-2 w-full px-3 py-3 rounded-xl bg-green-50 text-green-700 font-semibold disabled:opacity-50"
            >
              Marcar como cancelado — pago completo
            </button>
          </Field>
          <Field label="Saldo pendiente">
            <div className={`${inputCls} cursor-default font-bold text-lg ${saldo > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
              {saldo > 0 ? fmt(saldo) : (parseFloat(form.precio) > 0 ? 'Cancelado' : fmt(0))}
            </div>
          </Field>
        </div>

        <Field label="Diseñador (opcional)">
          <select className={inputCls} value={form.disenador} onChange={set('disenador')}>
            <option value="">Sin asignar — quedará pendiente</option>
            {DISENADORES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>

        <Field label="Archivo de referencia (foto o PDF)">
          <label className={`${inputCls} flex items-center gap-3 cursor-pointer hover:bg-gray-50`}>
            <I.Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 truncate">{archivo || 'Seleccionar foto o PDF de referencia...'}</span>
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setArchivo(e.target.files?.[0]?.name || '')} />
          </label>
          {archivo && <p className="text-xs text-green-600 mt-1 font-medium">✓ Archivo seleccionado: {archivo}</p>}
        </Field>

        <Field label="Observaciones adicionales">
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notas especiales, instrucciones del cliente..." value={form.observaciones} onChange={set('observaciones')} />
        </Field>

        <div className="flex gap-3 pt-2 pb-4">
          <button onClick={onCancel} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-95 shadow-lg" style={{ background: GRAD }}>
            Guardar trabajo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trabajos List ─────────────────────────────────────────────────────────────
function TrabajosScreen({
  trabajos, onSelectTrabajo, onNav,
}: {
  trabajos: Trabajo[];
  onSelectTrabajo: (id: string) => void;
  onNav: (s: Screen) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Estado | 'Todos'>('Todos');

  const filtered = useMemo(() => trabajos.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.cliente.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.tipo.toLowerCase().includes(q);
    const matchFilter = filter === 'Todos' || t.estado === filter;
    return matchSearch && matchFilter;
  }), [trabajos, search, filter]);

  const counts = useMemo(() => ({
    Todos: trabajos.length,
    Pendiente: trabajos.filter(t => t.estado === 'Pendiente').length,
    'En diseño': trabajos.filter(t => t.estado === 'En diseño').length,
    Listo: trabajos.filter(t => t.estado === 'Listo').length,
    Entregado: trabajos.filter(t => t.estado === 'Entregado').length,
  }), [trabajos]);

  return (
    <div className="p-5 lg:p-6 space-y-4 max-w-3xl">
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabajos</h1>
          <p className="text-gray-400 text-sm mt-0.5">{trabajos.length} pedidos registrados</p>
        </div>
        <button onClick={() => onNav('nuevo-trabajo')} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm shadow-sm hover:opacity-90 transition-all" style={{ background: GRAD }}>
          <I.Plus className="w-4 h-4" /> Nuevo trabajo
        </button>
      </div>

      <div className="relative">
        <I.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          className={`${inputCls} pl-12`}
          placeholder="Buscar por cliente, código o tipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(['Todos', 'Pendiente', 'En diseño', 'Listo', 'Entregado'] as const).map(e => (
          <button
            key={e}
            onClick={() => setFilter(e)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === e ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={filter === e ? { background: GRAD } : {}}
          >
            {e} <span className="opacity-70">({counts[e as keyof typeof counts]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <I.List className="w-14 h-14 mx-auto mb-3" />
            <p className="text-base font-medium">No se encontraron trabajos</p>
          </div>
        )}
        {filtered.map(t => {
          const saldo = t.precio - t.adelanto;
          return (
            <button
              key={t.id}
              onClick={() => { onSelectTrabajo(t.id); onNav('detalle'); }}
              className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-gray-300 bg-gray-50 px-2 py-0.5 rounded-lg">{t.id}</span>
                    <EstadoBadge estado={t.estado} />
                  </div>
                  <div className="font-bold text-gray-900 text-base leading-tight">{t.cliente}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{t.tipo}</div>
                  {t.disenador && (
                    <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <I.Palette className="w-3.5 h-3.5" />{t.disenador}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-gray-900 text-base">{fmt(t.precio)}</div>
                  {saldo > 0 ? (
                    <div className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full mt-1">Saldo: {fmt(saldo)}</div>
                  ) : (
                    <div className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full mt-1">Cancelado</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1 justify-end">
                    <I.Clock className="w-3 h-3" />{t.fechaEntrega}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Detalle Trabajo ───────────────────────────────────────────────────────────
function DetalleTrabajo({
  trabajo, onNav, onUpdateEstado, onUpdateTrabajo,
}: {
  trabajo: Trabajo;
  onNav: (s: Screen) => void;
  onUpdateEstado: (id: string, estado: Estado) => void;
  onUpdateTrabajo: (id: string, updates: Partial<Trabajo>) => void;
}) {
  const saldo = trabajo.precio - trabajo.adelanto;
  const [showAsignar, setShowAsignar] = useState(false);
  const [nuevoD, setNuevoD] = useState(trabajo.disenador);

  const next: Record<Estado, Estado | null> = {
    'Pendiente': 'En diseño',
    'En diseño': 'Listo',
    'Listo': 'Entregado',
    'Entregado': null,
  };
  const nextEstado = next[trabajo.estado];

  const waText = `Hola ${trabajo.cliente}, su pedido *${trabajo.id}* (${trabajo.tipo}) está *${trabajo.estado}*. Para más información contáctenos. Gracias — Creativa Impresos.`;
  const waLink = `https://wa.me/593${trabajo.telefono.replace(/^0/, '')}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="p-5 lg:p-6 max-w-2xl space-y-4">
      {/* Header desktop */}
      <div className="hidden lg:flex items-center gap-3 mb-2">
        <button onClick={() => onNav('trabajos')} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
          <I.Back className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalle del trabajo</h1>
          <span className="text-gray-400 font-mono text-sm">{trabajo.id}</span>
        </div>
      </div>

      {/* Status + action */}
      <div className="rounded-2xl p-4 flex flex-wrap items-center gap-3" style={{ background: 'linear-gradient(135deg, #1664A010, #0B93CD15)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Estado actual</p>
          <EstadoBadge estado={trabajo.estado} />
        </div>
        {nextEstado && (
          <button
            onClick={() => onUpdateEstado(trabajo.id, nextEstado)}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all shadow-sm flex-shrink-0"
            style={{ background: GRAD }}
          >
            → Marcar: {nextEstado}
          </button>
        )}
      </div>

      {/* WhatsApp prominent */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-base shadow-sm hover:opacity-90 transition-all"
        style={{ background: '#25D366' }}
      >
        <I.WhatsApp className="w-5 h-5" />
        Enviar notificación por WhatsApp
      </a>

      {/* Client */}
      <Card title="Cliente">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: GRAD }}>
            {initials(trabajo.cliente)}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">{trabajo.cliente}</div>
            <div className="text-gray-500 text-sm flex items-center gap-1">
              <I.Phone className="w-3.5 h-3.5" />{trabajo.telefono}
            </div>
          </div>
        </div>
      </Card>

      {/* Work info */}
      <Card title="Información del pedido">
        <div className="space-y-3">
          {[
            { label: 'Tipo', value: trabajo.tipo },
            { label: 'Descripción', value: trabajo.descripcion },
            { label: 'Recepción', value: trabajo.fechaRecepcion },
            { label: 'Entrega', value: trabajo.fechaEntrega },
            ...(trabajo.observaciones ? [{ label: 'Observaciones', value: trabajo.observaciones }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 text-sm w-28 flex-shrink-0 font-medium">{label}</span>
              <span className="text-gray-900 text-sm font-semibold flex-1">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Designer */}
      <Card title="Diseñador responsable">
        <div className="flex items-center justify-between gap-3">
          <div>
            {trabajo.disenador ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0B93CD' }}>
                  {initials(trabajo.disenador)}
                </div>
                <span className="font-bold text-gray-900">{trabajo.disenador}</span>
              </div>
            ) : (
              <span className="text-gray-400 italic">Sin diseñador asignado</span>
            )}
          </div>
          <button onClick={() => setShowAsignar(s => !s)} className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1">
            <I.Edit className="w-4 h-4" /> Asignar
          </button>
        </div>
        {showAsignar && (
          <div className="mt-3 flex gap-2">
            <select
              className={`${inputCls} flex-1`}
              value={nuevoD}
              onChange={e => setNuevoD(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {DISENADORES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              onClick={() => { onUpdateTrabajo(trabajo.id, { disenador: nuevoD }); setShowAsignar(false); }}
              className="px-4 py-2 rounded-xl text-white font-bold text-sm flex-shrink-0"
              style={{ background: '#1664A0' }}
            >
              OK
            </button>
          </div>
        )}
      </Card>

      {/* Financiero */}
      <Card title="Pago y saldo">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900">{fmt(trabajo.precio)}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold">Total</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-2xl font-bold text-green-700">{fmt(trabajo.adelanto)}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold">Importe pagado</div>
          </div>
          <div className={`text-center p-4 rounded-xl ${saldo > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className={`text-lg sm:text-2xl break-words font-bold ${saldo > 0 ? 'text-red-600' : 'text-green-700'}`}>{saldo > 0 ? fmt(saldo) : 'Cancelado'}</div>
            <div className="text-xs text-gray-500 mt-1 font-semibold">Saldo</div>
          </div>
        </div>
        {saldo > 0 ? (
          <button
            type="button"
            onClick={() => onUpdateTrabajo(trabajo.id, { adelanto: trabajo.precio })}
            className="w-full mt-4 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base"
          >
            Marcar como cancelado — pago completo
          </button>
        ) : (
          <p role="status" className="mt-4 text-center font-semibold text-green-700">Pago completo · Sin saldo pendiente</p>
        )}
      </Card>

      {/* Historial */}
      <Card title="Historial de estados">
        <div className="space-y-3">
          {trabajo.historial.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: i === trabajo.historial.length - 1 ? '#1664A0' : '#d1d5db' }} />
                {i < trabajo.historial.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 flex items-center justify-between">
                <EstadoBadge estado={h.estado} />
                <div className="text-right">
                  <div className="text-xs text-gray-400">{h.fecha}</div>
                  <div className="text-xs text-gray-500 font-semibold">{h.usuario}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <button className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
          <I.Edit className="w-5 h-5" /> Editar
        </button>
        {trabajo.estado === 'Listo' && (
          <button
            onClick={() => onUpdateEstado(trabajo.id, 'Entregado')}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all hover:opacity-90"
            style={{ background: '#16a34a' }}
          >
            <I.Check className="w-5 h-5" /> Marcar entregado
          </button>
        )}
      </div>
    </div>
  );
}

// ── Diseñadores ───────────────────────────────────────────────────────────────
function DisenadoresScreen({
  trabajos, onUpdateTrabajo,
}: {
  trabajos: Trabajo[];
  onUpdateTrabajo: (id: string, updates: Partial<Trabajo>) => void;
}) {
  const [tab, setTab] = useState<'disponibles' | 'mis-trabajos' | 'terminados'>('disponibles');
  const yo = 'Carlos Ruiz';

  const disponibles = trabajos.filter(t => t.estado === 'Pendiente');
  const mios = trabajos.filter(t => t.disenador === yo && t.estado === 'En diseño');
  const terminados = trabajos.filter(t => t.disenador === yo && (t.estado === 'Listo' || t.estado === 'Entregado'));

  const lista = { disponibles, 'mis-trabajos': mios, terminados }[tab];

  const tabs = [
    { id: 'disponibles' as const, label: 'Disponibles', count: disponibles.length },
    { id: 'mis-trabajos' as const, label: 'Mis trabajos', count: mios.length },
    { id: 'terminados' as const, label: 'Terminados', count: terminados.length },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de diseñadores</h1>
        <p className="text-sm text-gray-400 mt-1">Conectado como: <span className="font-bold text-[#1664A0]">{yo}</span></p>
      </div>

      {/* Designer stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Disponibles', value: disponibles.length, color: 'bg-amber-50 text-amber-600' },
          { label: 'En proceso', value: mios.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'Terminados', value: terminados.length, color: 'bg-green-50 text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${color} rounded-2xl p-4 text-center`}>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-xs font-semibold mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label} <span className="opacity-60">({count})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <I.Palette className="w-14 h-14 mx-auto mb-3" />
            <p className="font-medium">No hay trabajos en esta sección</p>
          </div>
        )}
        {lista.map(t => {
          const ms = new Date(t.fechaEntrega).getTime() - new Date(TODAY).getTime();
          const dias = Math.ceil(ms / 86400000);
          const urgente = dias <= 2 && t.estado !== 'Entregado';
          return (
            <div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${urgente ? 'border-orange-300' : 'border-gray-100'}`}>
              {urgente && (
                <div className="flex items-center gap-1.5 mb-2 text-orange-600 text-xs font-bold">
                  <span>⚡</span> ENTREGA URGENTE
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-300">{t.id}</span>
                    <EstadoBadge estado={t.estado} />
                  </div>
                  <div className="font-bold text-gray-900 text-base">{t.cliente}</div>
                  <div className="text-sm text-gray-500">{t.tipo}</div>
                  {t.descripcion && <div className="text-sm text-gray-400 mt-1 line-clamp-2">{t.descripcion}</div>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><I.Clock className="w-3.5 h-3.5" />Entrega: {t.fechaEntrega}</span>
                    <span className={`font-semibold ${dias <= 0 ? 'text-red-500' : dias <= 2 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {dias > 0 ? `${dias} día${dias !== 1 ? 's' : ''}` : 'Vencido'}
                    </span>
                  </div>
                </div>
              </div>
              {tab === 'disponibles' && (
                <button
                  onClick={() => onUpdateTrabajo(t.id, { disenador: yo, estado: 'En diseño' })}
                  className="mt-3 w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all"
                  style={{ background: GRAD }}
                >
                  Tomar este trabajo
                </button>
              )}
              {tab === 'mis-trabajos' && (
                <button
                  onClick={() => onUpdateTrabajo(t.id, { estado: 'Listo' })}
                  className="mt-3 w-full py-3 rounded-xl text-white font-bold text-sm bg-green-500 hover:bg-green-600 transition-all"
                >
                  ✓ Marcar como listo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Caja ──────────────────────────────────────────────────────────────────────
function CajaScreen({
  movimientos, onAdd,
}: {
  movimientos: Movimiento[];
  onAdd: (m: Movimiento) => void;
}) {
  const [modal, setModal] = useState<MovTipo | null>(null);
  const [form, setForm] = useState({ concepto: '', monto: '', responsable: 'L. Virginia' });

  const hoy = movimientos.filter(m => m.fecha === TODAY);
  const ingresos = hoy.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const egresos = hoy.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  const pendiente = 295.00;

  const handleAdd = () => {
    if (!form.concepto.trim() || !form.monto) return;
    onAdd({
      id: `M-${Date.now()}`, fecha: TODAY, hora: now(),
      concepto: form.concepto, tipo: modal!, monto: parseFloat(form.monto),
      responsable: form.responsable,
    });
    setForm({ concepto: '', monto: '', responsable: 'L. Virginia' });
    setModal(null);
  };

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 hidden lg:block">Caja</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Ingresos hoy</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{fmt(ingresos)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-bold uppercase tracking-wide">Egresos hoy</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{fmt(egresos)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Saldo del día</p>
          <p className={`text-3xl font-bold mt-1 ${ingresos - egresos >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmt(ingresos - egresos)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wide">Por cobrar</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">{fmt(pendiente)}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setModal('ingreso')} className="py-4 rounded-2xl text-white font-bold text-base bg-green-500 hover:bg-green-600 transition-all shadow-sm flex items-center justify-center gap-2">
          <I.Plus className="w-5 h-5" /> Ingreso
        </button>
        <button onClick={() => setModal('egreso')} className="py-4 rounded-2xl text-white font-bold text-base bg-red-500 hover:bg-red-600 transition-all shadow-sm flex items-center justify-center gap-2">
          <I.X className="w-5 h-5" /> Egreso
        </button>
        <button className="py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 transition-all">
          Cierre
        </button>
      </div>

      {/* Movimientos */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Movimientos recientes</h2>
        <div className="space-y-2">
          {movimientos.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                {m.tipo === 'ingreso' ? '+' : '−'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{m.concepto}</p>
                <p className="text-xs text-gray-400">{m.fecha} · {m.hora} · {m.responsable}</p>
              </div>
              <div className={`font-bold text-base flex-shrink-0 ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                {m.tipo === 'ingreso' ? '+' : '−'}{fmt(m.monto)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">
                {modal === 'ingreso' ? '+ Registrar ingreso' : '− Registrar egreso'}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
                <I.X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Concepto">
                <input className={inputCls} placeholder="Descripción del movimiento" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
              </Field>
              <Field label="Monto ($)">
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
              </Field>
              <Field label="Responsable">
                <input className={inputCls} value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} />
              </Field>
              <button
                onClick={handleAdd}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 shadow-sm"
                style={{ background: modal === 'ingreso' ? '#16a34a' : '#dc2626' }}
              >
                Registrar {modal === 'ingreso' ? 'ingreso' : 'egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clientes ──────────────────────────────────────────────────────────────────
function ClientesScreen({ clientes, trabajos }: { clientes: Cliente[]; trabajos: Trabajo[] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Cliente | null>(null);

  if (selected) {
    const historial = trabajos.filter(t => t.cliente === selected.nombre);
    return (
      <div className="p-5 lg:p-6 max-w-2xl space-y-4">
        <div className="hidden lg:flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-all"><I.Back className="w-5 h-5 text-gray-600" /></button>
          <h1 className="text-2xl font-bold text-gray-900">{selected.nombre}</h1>
        </div>

        <Card>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm" style={{ background: GRAD }}>
              {initials(selected.nombre)}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-xl">{selected.nombre}</div>
              <div className="text-gray-500 flex items-center gap-1 mt-0.5"><I.Phone className="w-4 h-4" />{selected.telefono}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">{selected.trabajosCount}</div>
              <div className="text-xs text-gray-500 font-semibold">Trabajos</div>
            </div>
            <div className={`text-center p-3 rounded-xl ${selected.deuda > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className={`text-2xl font-bold ${selected.deuda > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(selected.deuda)}</div>
              <div className="text-xs text-gray-500 font-semibold">Deuda</div>
            </div>
            <a
              href={`https://wa.me/593${selected.telefono.replace(/^0/, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-all"
            >
              <I.WhatsApp className="w-6 h-6 text-green-600" />
              <span className="text-xs text-green-600 font-bold mt-1">WhatsApp</span>
            </a>
          </div>
        </Card>

        <h2 className="font-bold text-gray-900 text-lg">Historial de trabajos</h2>
        <div className="space-y-2">
          {historial.length === 0 && <p className="text-gray-400 italic text-sm">Sin trabajos registrados en el sistema.</p>}
          {historial.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-300">{t.id}</span>
                  <EstadoBadge estado={t.estado} />
                </div>
                <div className="font-bold text-gray-900">{t.tipo}</div>
                <div className="text-xs text-gray-400 mt-0.5">Entrega: {t.fechaEntrega}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{fmt(t.precio)}</div>
                {t.precio - t.adelanto > 0 && <div className="text-xs text-red-500 font-semibold">Saldo: {fmt(t.precio - t.adelanto)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    return !q || c.nombre.toLowerCase().includes(q) || c.telefono.includes(q);
  });

  return (
    <div className="p-5 lg:p-6 space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 hidden lg:block">Clientes</h1>

      <div className="relative">
        <I.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input className={`${inputCls} pl-12`} placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: GRAD }}>
              {initials(c.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-base">{c.nombre}</div>
              <div className="text-sm text-gray-400 flex items-center gap-1 mt-0.5"><I.Phone className="w-3.5 h-3.5" />{c.telefono}</div>
              <div className="text-xs text-gray-300 mt-0.5">{c.trabajosCount} trabajos</div>
            </div>
            <div className="text-right flex-shrink-0">
              {c.deuda > 0
                ? <div className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">Debe: {fmt(c.deuda)}</div>
                : <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Al día ✓</div>
              }
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Reportes ──────────────────────────────────────────────────────────────────
function ReportesScreen({ trabajos, movimientos }: { trabajos: Trabajo[]; movimientos: Movimiento[] }) {
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

  const porTipo = TIPOS.map(tipo => ({ tipo, count: trabajos.filter(t => t.tipo === tipo).length }))
    .filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  const maxTipo = Math.max(...porTipo.map(x => x.count), 1);

  const porDisenador = DISENADORES.map(d => ({ nombre: d, count: trabajos.filter(t => t.disenador === d).length }))
    .sort((a, b) => b.count - a.count);
  const maxD = Math.max(...porDisenador.map(x => x.count), 1);

  const estados: Estado[] = ['Pendiente', 'En diseño', 'Listo', 'Entregado'];

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 hidden lg:block">Reportes</h1>

      {/* Resumen financiero */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Ingresos</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{fmt(totalIngresos)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-bold uppercase tracking-wide">Egresos</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{fmt(totalEgresos)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Balance</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalIngresos - totalEgresos)}</p>
        </div>
      </div>

      {/* Por estado */}
      <Card title="Trabajos por estado">
        <div className="grid grid-cols-2 gap-3">
          {estados.map(e => {
            const count = trabajos.filter(t => t.estado === e).length;
            const c = estadoBadge[e];
            return (
              <div key={e} className={`${c.bg} rounded-xl p-4`}>
                <div className={`text-3xl font-bold ${c.text}`}>{count}</div>
                <div className={`text-sm font-semibold mt-0.5 ${c.text}`}>{e}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Por tipo */}
      <Card title="Trabajos por tipo">
        <div className="space-y-4">
          {porTipo.map(({ tipo, count }) => (
            <div key={tipo}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-gray-700">{tipo}</span>
                <span className="text-gray-400 font-semibold">{count} trabajo{count !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxTipo) * 100}%`, background: GRAD }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Por diseñador */}
      <Card title="Trabajos por diseñador">
        <div className="space-y-4">
          {porDisenador.map(({ nombre, count }) => (
            <div key={nombre}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#0B93CD' }}>
                  {initials(nombre)}
                </div>
                <span className="font-semibold text-gray-700 flex-1">{nombre}</span>
                <span className="text-gray-400 font-semibold text-sm">{count}</span>
              </div>
              <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden ml-10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxD) * 100}%`, background: 'linear-gradient(90deg, #0B93CD, #1664A0)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cuentas pendientes */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <h3 className="font-bold text-amber-900 mb-3">Cuentas por cobrar</h3>
        <div className="space-y-2">
          {trabajos
            .filter(t => t.precio - t.adelanto > 0 && t.estado !== 'Entregado')
            .map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <div className="font-bold text-gray-900 text-sm">{t.cliente}</div>
                  <div className="text-xs text-gray-400">{t.id} · {t.tipo} · <span className="font-medium">{t.estado}</span></div>
                </div>
                <div className="font-bold text-red-600 text-base">{fmt(t.precio - t.adelanto)}</div>
              </div>
            ))
          }
        </div>
        <div className="mt-3 pt-3 border-t border-amber-200 flex justify-between items-center">
          <span className="font-bold text-amber-800">Total pendiente</span>
          <span className="font-bold text-red-600 text-lg">
            {fmt(trabajos.filter(t => t.estado !== 'Entregado').reduce((s, t) => s + (t.precio - t.adelanto), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Configuración ─────────────────────────────────────────────────────────────
function ConfigScreen() {
  const items = [
    { label: 'Información de la empresa', desc: 'Nombre, dirección, logo' },
    { label: 'Usuarios y permisos', desc: 'Recepcionistas y diseñadores' },
    { label: 'Tipos de trabajo', desc: 'Agregar o editar categorías' },
    { label: 'Respaldo de datos', desc: 'Exportar base de datos' },
    { label: 'Acerca del sistema', desc: 'Versión 1.0.0 — Creativa Impresos' },
  ];
  return (
    <div className="p-5 lg:p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 hidden lg:block">Configuración</h1>
      <Card>
        <div className="divide-y divide-gray-50">
          {items.map(({ label, desc }) => (
            <button key={label} className="w-full flex items-center justify-between py-4 px-1 hover:bg-gray-50 transition-all text-left rounded-xl">
              <div>
                <div className="font-bold text-gray-900">{label}</div>
                <div className="text-sm text-gray-400">{desc}</div>
              </div>
              <I.ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: GRAD }}>
            LV
          </div>
          <div>
            <div className="font-bold text-gray-900">L. Virginia</div>
            <div className="text-sm text-gray-500">recepcion@creativa.com · Recepción</div>
          </div>
        </div>
        <button className="mt-4 w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all">
          Cerrar sesión
        </button>
      </Card>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [trabajos, setTrabajos] = useState<Trabajo[]>(INIT_TRABAJOS);
  const [movimientos, setMovimientos] = useState<Movimiento[]>(INIT_MOVIMIENTOS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const screenTitles: Record<Screen, string> = {
    login: 'Creativa Impresos', dashboard: 'Inicio', 'nuevo-trabajo': 'Nuevo trabajo',
    trabajos: 'Trabajos', detalle: 'Detalle', disenadores: 'Diseñadores',
    caja: 'Caja', clientes: 'Clientes', reportes: 'Reportes', config: 'Configuración',
  };

  if (screen === 'login') return <LoginScreen onLogin={() => setScreen('dashboard')} />;

  const job = trabajos.find(t => t.id === selectedId);

  const updateEstado = (id: string, estado: Estado) => {
    setTrabajos(ts => ts.map(t => t.id !== id ? t : {
      ...t, estado,
      historial: [...t.historial, { estado, fecha: `${TODAY} ${now()}`, usuario: screen === 'disenadores' ? 'Carlos Ruiz' : 'Recepción' }],
    }));
  };

  const updateTrabajo = (id: string, updates: Partial<Trabajo>) => {
    setTrabajos(ts => ts.map(t => {
      if (t.id !== id) return t;
      const n = { ...t, ...updates };
      if (updates.estado && updates.estado !== t.estado) {
        n.historial = [...t.historial, { estado: updates.estado, fecha: `${TODAY} ${now()}`, usuario: 'Carlos Ruiz' }];
      }
      return n;
    }));
  };

  const isDetalle = screen === 'detalle';
  const prevScreen = isDetalle ? 'trabajos' : undefined;

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <div className="flex min-h-screen">
        <Sidebar current={screen} onNav={setScreen} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <TopBar
            title={isDetalle && job ? job.id : screenTitles[screen]}
            onBack={isDetalle ? () => setScreen('trabajos') : undefined}
          />
          <main className="flex-1 overflow-y-auto pb-28 lg:pb-6">
            {screen === 'dashboard' && (
              <Dashboard trabajos={trabajos} onNav={setScreen} onSelectTrabajo={id => { setSelectedId(id); setScreen('detalle'); }} />
            )}
            {screen === 'nuevo-trabajo' && (
              <NuevoTrabajo
                onSave={t => { setTrabajos(ts => [t, ...ts]); setScreen('trabajos'); }}
                onCancel={() => setScreen('dashboard')}
              />
            )}
            {screen === 'trabajos' && (
              <TrabajosScreen trabajos={trabajos} onSelectTrabajo={id => { setSelectedId(id); setScreen('detalle'); }} onNav={setScreen} />
            )}
            {screen === 'detalle' && (
              job
                ? <DetalleTrabajo trabajo={job} onNav={setScreen} onUpdateEstado={updateEstado} onUpdateTrabajo={updateTrabajo} />
                : <div className="p-6 text-gray-400 text-center py-20">Seleccione un trabajo para ver el detalle.</div>
            )}
            {screen === 'disenadores' && (
              <DisenadoresScreen trabajos={trabajos} onUpdateTrabajo={updateTrabajo} />
            )}
            {screen === 'caja' && (
              <CajaScreen movimientos={movimientos} onAdd={m => setMovimientos(ms => [m, ...ms])} />
            )}
            {screen === 'clientes' && (
              <ClientesScreen clientes={CLIENTES_DATA} trabajos={trabajos} />
            )}
            {screen === 'reportes' && (
              <ReportesScreen trabajos={trabajos} movimientos={movimientos} />
            )}
            {screen === 'config' && <ConfigScreen />}
          </main>
        </div>
      </div>
      <BottomNav current={screen} onNav={setScreen} />
    </div>
  );
}