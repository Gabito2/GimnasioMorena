import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';

export interface Persona {
  id: string;
  /** Nombre completo (nombre y apellido en un solo campo). */
  nombre: string;
  telefono: string;
  fechaIngreso: string; // ISO yyyy-MM-dd
  montoCuota: number;
  fechaVencimiento: string; // ISO yyyy-MM-dd
  /** Baja lógica: el socio dejó el gimnasio. Se conserva su historial. */
  activo?: boolean;
}

export type EstadoCuota = 'al-dia' | 'por-vencer' | 'vencido';

export interface PersonaConEstado extends Persona {
  diasRestantes: number;
  estado: EstadoCuota;
  estadoTexto: string;
  /** true si el socio ya pagó la cuota del mes corriente. */
  pagoMes: boolean;
  /** Meses pagados (yyyy-MM), del más nuevo al más viejo. */
  mesesPagados: string[];
  /** Cantidad de meses pagados en el año corriente. */
  pagosAnio: number;
}

/** Registro de un mes de cuota pagado. */
export interface Pago {
  /** ID del pago. */
  id: string;
  /** ID del socio que pagó. */
  personaId: string;
  /** Mes cubierto por el pago (ISO yyyy-MM, ej. '2026-09'). */
  mes: string;
  /** Día del pago (ISO yyyy-MM-dd). */
  fecha: string;
  /** Monto abonado. */
  monto: number;
}

const STORAGE_KEY = 'gym-morena-personas';
const STORAGE_KEY_PAGOS = 'gym-morena-pagos';
const MS_POR_DIA = 1000 * 60 * 60 * 24;

@Injectable({ providedIn: 'root' })
export class GymService {
  private toastCtrl = inject(ToastController);
  readonly personas = signal<Persona[]>(this.cargar());
  readonly pagos = signal<Pago[]>(this.cargarPagos());
  readonly hayDatos = computed(() => this.personas().length > 0);

  // ---------- Persistencia ----------
  private guardar(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.personas()));
    } catch {
      this.mostrarToast('No se pudo guardar en este dispositivo', 'danger');
    }
  }

  private guardarPagos(): void {
    try {
      localStorage.setItem(STORAGE_KEY_PAGOS, JSON.stringify(this.pagos()));
    } catch {
      this.mostrarToast('No se pudo guardar el registro de pagos', 'danger');
    }
  }

  private cargar(): Persona[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const lista = JSON.parse(raw) as Persona[];
      // Migración: datos viejos guardaban nombre y apellido por separado.
      return lista.map((p) => {
        const legacy = (p as Persona & { apellido?: string }).apellido?.trim() ?? '';
        const base = (p.nombre ?? '').trim();
        const nombre = legacy && !base.includes(legacy) ? `${base} ${legacy}`.trim() : base;
        return {
          id: p.id,
          nombre,
          telefono: p.telefono ?? '',
          fechaIngreso: p.fechaIngreso ?? '',
          montoCuota: p.montoCuota ?? 0,
          fechaVencimiento: p.fechaVencimiento ?? '',
          activo: p.activo ?? true,
        };
      });
    } catch {
      return [];
    }
  }

  private cargarPagos(): Pago[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAGOS);
      if (!raw) return [];
      const lista = JSON.parse(raw) as Pago[];
      if (!Array.isArray(lista)) return [];
      return lista
        .filter((p) => p && typeof p.personaId === 'string' && typeof p.mes === 'string')
        .map((p) => ({
          id: typeof p.id === 'string' && p.id ? p.id : this.generarId(),
          personaId: p.personaId,
          mes: p.mes,
          fecha: typeof p.fecha === 'string' ? p.fecha : '',
          monto: typeof p.monto === 'number' && !isNaN(p.monto) ? p.monto : 0,
        }));
    } catch {
      return [];
    }
  }

  private mostrarToast(mensaje: string, color = 'success'): void {
    void this.toastCtrl
      .create({ message: mensaje, duration: 2200, color, position: 'top' })
      .then((t) => void t.present());
  }

  // ---------- Utilidades de fechas ----------
  /**
   * Convierte una Date a ISO yyyy-MM-dd usando la fecha LOCAL.
   * (toISOString() usa UTC y en horarios como 00:00–03:00 en Argentina
   * devolvía el día anterior).
   */
  static aISO(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  static hoyISO(): string {
    return GymService.aISO(new Date());
  }

  /** Diferencia en días entre hoy y la fecha (positivo = faltan días, negativo = venció hace X días). */
  static diasRestantes(fechaISO: string): number {
    const hoy = new Date(GymService.hoyISO() + 'T00:00:00');
    const fecha = new Date(fechaISO + 'T00:00:00');
    if (isNaN(fecha.getTime())) return 0;
    return Math.round((fecha.getTime() - hoy.getTime()) / MS_POR_DIA);
  }

  /** Suma un mes conservando el día (maneja meses cortos, ej. 31 ene -> 28/29 feb). */
  static sumarUnMes(fechaISO: string): string {
    const d = new Date(fechaISO + 'T00:00:00');
    const diaOriginal = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() !== diaOriginal) {
      d.setDate(0); // vuelve al último día del mes anterior
    }
    return GymService.aISO(d);
  }

  estadoDe(p: Persona): PersonaConEstado {
    const dias = GymService.diasRestantes(p.fechaVencimiento);
    let estado: EstadoCuota;
    if (dias < 0) estado = 'vencido';
    else if (dias <= 5) estado = 'por-vencer';
    else estado = 'al-dia';

    const estadoTexto =
      dias === 0
        ? 'Vence hoy'
        : dias > 0
          ? dias === 1
            ? 'Falta 1 día'
            : `Faltan ${dias} días`
          : dias === -1
            ? 'Vencido hace 1 día'
            : `Vencido hace ${Math.abs(dias)} días`;

    return {
      ...p,
      diasRestantes: dias,
      estado,
      estadoTexto,
      pagoMes: this.pagoDelMes(p.id),
      mesesPagados: this.pagos()
        .filter((x) => x.personaId === p.id)
        .map((x) => x.mes)
        .sort((a, b) => b.localeCompare(a)),
      pagosAnio: this.pagos().filter(
        (x) => x.personaId === p.id && x.mes.slice(0, 4) === GymService.hoyISO().slice(0, 4),
      ).length,
    };
  }

  // ---------- CRUD ----------
  agregar(datos: Omit<Persona, 'id'>): Persona {
    const nueva: Persona = { ...datos, id: this.generarId() };
    this.personas.update((lista) => [nueva, ...lista]);
    this.guardar();
    return nueva;
  }

  actualizar(p: Persona): void {
    this.personas.update((lista) => lista.map((x) => (x.id === p.id ? { ...p } : x)));
    this.guardar();
  }

  eliminar(id: string): void {
    this.personas.update((lista) => lista.filter((x) => x.id !== id));
    // El historial de pagos del socio eliminado ya no tiene dueño: se limpia.
    this.pagos.update((lista) => lista.filter((x) => x.personaId !== id));
    this.guardar();
    this.guardarPagos();
  }

  // ---------- Pagos ----------
  /**
   * Marca la cuota del mes corriente como pagada y renueva el vencimiento un mes.
   * No duplica el registro si el mes ya estaba marcado.
   */
  marcarPagado(personaId: string): void {
    const mes = GymService.hoyISO().slice(0, 7);
    if (!this.estaPagado(personaId, mes)) {
      const p = this.personas().find((x) => x.id === personaId);
      const pago: Pago = {
        id: this.generarId(),
        personaId,
        mes,
        fecha: GymService.hoyISO(),
        monto: p?.montoCuota ?? 0,
      };
      this.pagos.update((lista) => [pago, ...lista]);
      this.guardarPagos();
    }
    // Pagar el mes implica renovar la cuota (igual que "Cobrar y renovar").
    this.renovarCuota(personaId);
  }

  /** Quita la marca de pago del mes corriente (desmarcar). */
  desmarcarPagado(personaId: string): void {
    const mes = GymService.hoyISO().slice(0, 7);
    this.pagos.update((lista) => lista.filter((x) => !(x.personaId === personaId && x.mes === mes)));
    this.guardarPagos();
  }

  /** true si el socio tiene registrado el pago del mes dado (yyyy-MM). */
  estaPagado(personaId: string, mes: string): boolean {
    return this.pagos().some((x) => x.personaId === personaId && x.mes === mes);
  }

  /** true si el socio tiene registrado el pago del mes corriente. */
  pagoDelMes(personaId: string): boolean {
    return this.estaPagado(personaId, GymService.hoyISO().slice(0, 7));
  }

  /** Historial de pagos de un socio, del más reciente al más viejo. */
  pagosDe(personaId: string): Pago[] {
    return this.pagos()
      .filter((x) => x.personaId === personaId)
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }

  /** Marca el pago del mes dado (yyyy-MM). No duplica y no toca el vencimiento. */
  registrarPago(personaId: string, mes: string): void {
    if (!/^\d{4}-\d{2}$/.test(mes) || this.estaPagado(personaId, mes)) return;
    const p = this.personas().find((x) => x.id === personaId);
    const pago: Pago = {
      id: this.generarId(),
      personaId,
      mes,
      fecha: GymService.hoyISO(),
      monto: p?.montoCuota ?? 0,
    };
    this.pagos.update((lista) => [pago, ...lista]);
    this.guardarPagos();
  }

  /** Quita el registro de pago del mes dado (yyyy-MM). */
  quitarPago(personaId: string, mes: string): void {
    this.pagos.update((lista) => lista.filter((x) => !(x.personaId === personaId && x.mes === mes)));
    this.guardarPagos();
  }

  /** true si el socio tiene algún pago registrado. */
  tienePagos(personaId: string): boolean {
    return this.pagos().some((x) => x.personaId === personaId);
  }

  /** true si el socio tiene algún pago registrado en el año dado. */
  pagoEnAnio(personaId: string, anio: string): boolean {
    return this.pagos().some((x) => x.personaId === personaId && x.mes.slice(0, 4) === anio);
  }

  // ---------- Bajas ----------
  /** Da de baja al socio (baja lógica, conserva datos e historial). */
  darBaja(id: string): void {
    this.actualizarCampo(id, { activo: false });
  }

  /** Reactiva a un socio dado de baja. */
  reactivar(id: string): void {
    this.actualizarCampo(id, { activo: true });
  }

  private actualizarCampo(id: string, cambios: Partial<Persona>): void {
    this.personas.update((lista) => lista.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    this.guardar();
  }

  renovarCuota(id: string): void {
    const p = this.personas().find((x) => x.id === id);
    if (!p) return;
    const base = GymService.diasRestantes(p.fechaVencimiento) > 0 ? p.fechaVencimiento : GymService.hoyISO();
    this.actualizar({ ...p, fechaVencimiento: GymService.sumarUnMes(base) });
  }

  reemplazarTodo(personas: Persona[], pagos?: Pago[]): void {
    // Normaliza el flag de baja: datos viejos pueden no traerlo.
    this.personas.set(personas.map((p) => ({ ...p, activo: p.activo ?? true })));
    this.guardar();
    // Al reemplazar los datos, el historial de pagos viejo deja de tener sentido:
    // se conserva solo si viene en el import (ids compatibles).
    this.pagos.set(pagos ?? []);
    this.guardarPagos();
  }

  private generarId(): string {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Importar / Exportar ----------
  exportarJSON(): string {
    const data = {
      app: 'Gym Morena',
      version: 2,
      exportado: new Date().toISOString(),
      personas: this.personas(),
      pagos: this.pagos(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Valida e importa un archivo JSON exportado por la app.
   * @returns la cantidad de alumnos importados.
   * @throws Error con mensaje legible si el archivo no es válido.
   */
  importarJSON(texto: string): number {
    let data: unknown;
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error('El archivo no es un JSON válido');
    }

    let lista: unknown;
    if (data && typeof data === 'object' && Array.isArray((data as { personas?: unknown }).personas)) {
      lista = (data as { personas: unknown }).personas;
    } else if (Array.isArray(data)) {
      lista = data;
    } else {
      throw new Error('El archivo no contiene un listado de alumnos válido');
    }

    // Los pagos son opcionales: los exports v1 no los traen.
    const pagosRaw = (data as { pagos?: unknown } | null);
    const listaPagos = pagosRaw && typeof pagosRaw === 'object' && Array.isArray(pagosRaw.pagos) ? pagosRaw.pagos : [];

    const personas = (lista as unknown[]).map((x, i) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const campo = (nombre: string): unknown => o[nombre] ?? o[this.normalizar(nombre)];
      // Acepta exports viejos (nombre + apellido separados) y nuevos (nombre completo).
      const nombreBase = String(campo('nombre') ?? '').trim();
      const apellido = String(campo('apellido') ?? '').trim();
      const nombre =
        apellido && !nombreBase.includes(apellido) ? `${nombreBase} ${apellido}`.trim() : nombreBase;
      const fechaIngreso = this.normalizarFecha(campo('fechaIngreso'));
      const fechaVencimiento = this.normalizarFecha(campo('fechaVencimiento'));
      const montoCuota = Number(campo('montoCuota') ?? 0);
      if (!nombre) throw new Error(`El alumno #${i + 1} no tiene un nombre válido`);
      if (!fechaVencimiento) throw new Error(`El alumno #${i + 1} no tiene una fecha de vencimiento válida`);
      return {
        id: typeof o['id'] === 'string' && o['id'] ? (o['id'] as string) : this.generarId(),
        nombre,
        telefono: String(campo('telefono') ?? ''),
        fechaIngreso,
        montoCuota: isNaN(montoCuota) ? 0 : montoCuota,
        fechaVencimiento,
        activo: o['activo'] === undefined ? true : Boolean(o['activo']),
      } as Persona;
    });

    const ids = new Set(personas.map((p) => p.id));
    const pagos = (listaPagos as unknown[]).map((x, i) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        id: typeof o['id'] === 'string' && o['id'] ? (o['id'] as string) : this.generarId(),
        personaId: String(o['personaId'] ?? ''),
        mes: String(o['mes'] ?? '').slice(0, 7),
        fecha: typeof o['fecha'] === 'string' ? o['fecha'] : '',
        monto: typeof o['monto'] === 'number' && !isNaN(o['monto']) ? o['monto'] : 0,
      } as Pago;
    }).filter((x) => ids.has(x.personaId) && /^\d{4}-\d{2}$/.test(x.mes));

    this.reemplazarTodo(personas, pagos);
    return personas.length;
  }

  private normalizar(nombre: string): string {
    return nombre.charAt(0).toLowerCase() + nombre.slice(1);
  }

  private normalizarFecha(valor: unknown): string {
    // ISO con fecha explícita: se toma tal cual (evita el corrimiento por UTC).
    if (typeof valor === 'string') {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    if (typeof valor !== 'string' && !(valor instanceof Date)) return '';
    const d = new Date(valor);
    return isNaN(d.getTime()) ? '' : GymService.aISO(d);
  }

  // ---------- WhatsApp ----------
  /**
   * Arma el mensaje estándar de recordatorio de cuota para un socio.
   * @param primeraSiNoPago true agrega la línea "primer recordatorio".
   */
  static mensajeRecordatorio(nombre: string, fechaVencimiento: string, montoCuota: number, primeraSiNoPago = true): string {
    const [y, m, d] = fechaVencimiento.split('-');
    const fecha = d && m && y ? `${d}/${m}/${y}` : fechaVencimiento;
    const monto = '$' + (montoCuota || 0).toLocaleString('es-AR');
    const saludo = `Hola ${nombre}! Te escribimos de Gym Morena 💪`;
    if (primeraSiNoPago) {
      return (
        `${saludo}

` +
        `Te recordamos que tu cuota del mes está próxima a vencer:

` +
        `📅 Vence: ${fecha}
` +
        `💳 Importe: ${monto}

` +
        `Podes abonar en el gimnasio o coordinar el pago por este medio.
` +
        `¡Gracias por entrenar con nosotros! 🏋️`
      );
    }
    return (
      `${saludo}

` +
      `Te pasamos el recordatorio de tu cuota:

` +
      `📅 Vence: ${fecha}
` +
      `💳 Importe: ${monto}

` +
      `¡Gracias por entrenar con nosotros! 🏋️`
    );
  }

  /** Mensaje de agradecimiento luego de marcar la cuota como pagada. */
  static mensajeGracias(nombre: string, montoCuota: number): string {
    const monto = '$' + (montoCuota || 0).toLocaleString('es-AR');
    return (
      `Hola ${nombre}! Te escribimos de Gym Morena 💪

` +
      `Confirmamos el pago de tu cuota (${monto}). ¡Gracias por seguir entrenando con nosotros! 🏋️`
    );
  }

  /** Normaliza un teléfono local (Argentina) al formato internacional de WhatsApp. */
  static normalizarTelefono(telefono: string): string {
    let t = (telefono ?? '').replace(/[^0-9+]/g, '');
    if (t.startsWith('+')) t = t.slice(1);
    if (t.startsWith('54')) return t;
    // Larga distancia nacional: 0 + 11 dígitos (p. ej. 0351 5551234).
    if (t.startsWith('0') && t.length >= 11) return '54' + t.slice(1);
    // Números locales de 10 dígitos (p. ej. 351 5551234).
    if (t.length === 10) return '54' + t;
    return t;
  }

  /**
   * Devuelve la URL para abrir WhatsApp con el mensaje precargado (wa.me).
   * Devuelve null si el socio no tiene teléfono válido.
   */
  static urlWhatsApp(telefono: string, mensaje: string): string | null {
    const tel = GymService.normalizarTelefono(telefono);
    if (!tel) return null;
    return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
  }

  /** Abre WhatsApp (o wa.me en web) con el mensaje precargado. */
  enviarWhatsApp(telefono: string, mensaje: string): void {
    const url = GymService.urlWhatsApp(telefono, mensaje);
    if (!url) {
      this.mostrarToast('El socio no tiene un teléfono de WhatsApp válido', 'warning');
      return;
    }
    window.open(url, '_blank');
  }
}
