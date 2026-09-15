import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  fechaIngreso: string; // ISO yyyy-MM-dd
  montoCuota: number;
  fechaVencimiento: string; // ISO yyyy-MM-dd
}

export type EstadoCuota = 'al-dia' | 'por-vencer' | 'vencido';

export interface PersonaConEstado extends Persona {
  diasRestantes: number;
  estado: EstadoCuota;
  estadoTexto: string;
}

const STORAGE_KEY = 'gym-morena-personas';
const MS_POR_DIA = 1000 * 60 * 60 * 24;

@Injectable({ providedIn: 'root' })
export class GymService {
  private toastCtrl = inject(ToastController);
  readonly personas = signal<Persona[]>(this.cargar());
  readonly hayDatos = computed(() => this.personas().length > 0);

  // ---------- Persistencia ----------
  private guardar(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.personas()));
    } catch {
      this.mostrarToast('No se pudo guardar en este dispositivo', 'danger');
    }
  }

  private cargar(): Persona[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Persona[]) : [];
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
  static hoyISO(): string {
    return new Date().toISOString().slice(0, 10);
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
    return d.toISOString().slice(0, 10);
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

    return { ...p, diasRestantes: dias, estado, estadoTexto };
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
    this.guardar();
  }

  renovarCuota(id: string): void {
    const p = this.personas().find((x) => x.id === id);
    if (!p) return;
    const base = GymService.diasRestantes(p.fechaVencimiento) > 0 ? p.fechaVencimiento : GymService.hoyISO();
    this.actualizar({ ...p, fechaVencimiento: GymService.sumarUnMes(base) });
  }

  reemplazarTodo(personas: Persona[]): void {
    this.personas.set(personas);
    this.guardar();
  }

  private generarId(): string {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Importar / Exportar ----------
  exportarJSON(): string {
    const data = {
      app: 'Gym Morena',
      version: 1,
      exportado: new Date().toISOString(),
      personas: this.personas(),
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

    const personas = (lista as unknown[]).map((x, i) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const campo = (nombre: string): unknown => o[nombre] ?? o[this.normalizar(nombre)];
      const nombre = String(campo('nombre') ?? '').trim();
      const apellido = String(campo('apellido') ?? '').trim();
      const fechaIngreso = this.normalizarFecha(campo('fechaIngreso'));
      const fechaVencimiento = this.normalizarFecha(campo('fechaVencimiento'));
      const montoCuota = Number(campo('montoCuota') ?? 0);
      if (!nombre || !apellido) throw new Error(`El alumno #${i + 1} no tiene nombre o apellido`);
      if (!fechaVencimiento) throw new Error(`El alumno #${i + 1} no tiene una fecha de vencimiento válida`);
      return {
        id: typeof o['id'] === 'string' && o['id'] ? (o['id'] as string) : this.generarId(),
        nombre,
        apellido,
        telefono: String(campo('telefono') ?? ''),
        fechaIngreso,
        montoCuota: isNaN(montoCuota) ? 0 : montoCuota,
        fechaVencimiento,
      } as Persona;
    });

    this.reemplazarTodo(personas);
    return personas.length;
  }

  private normalizar(nombre: string): string {
    return nombre.charAt(0).toLowerCase() + nombre.slice(1);
  }

  private normalizarFecha(valor: unknown): string {
    if (typeof valor !== 'string' && !(valor instanceof Date)) return '';
    const d = new Date(valor);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
}
