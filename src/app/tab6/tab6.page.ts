import { Component, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonCard, IonCardContent, IonList, IonItem, IonLabel, IonChip, IonSearchbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  walletOutline, calendarClearOutline, checkmarkCircle, chevronBackOutline,
  chevronForwardOutline, personOutline, searchOutline, closeCircleOutline,
} from 'ionicons/icons';
import { GymService, PersonaConEstado } from '../services/gym.service';

interface MesGrilla {
  /** Clave yyyy-MM que identifica al mes. */
  clave: string;
  nombre: string;
  corto: string;
  actual: boolean;
  futuro: boolean;
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-tab6',
  templateUrl: 'tab6.page.html',
  styleUrls: ['tab6.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonCard, IonCardContent, IonList, IonItem, IonLabel, IonChip, IonSearchbar,
  ],
})
export class Tab6Page {
  private gym = inject(GymService);
  private toastCtrl = inject(ToastController);

  readonly hoyClave = GymService.hoyISO().slice(0, 7); // yyyy-MM

  /** Año que se está viendo en la grilla. */
  readonly anio = signal<number>(Number(this.hoyClave.slice(0, 4)));
  /** Socio seleccionado (null = todavía no eligió ninguno). */
  readonly socioId = signal<string | null>(null);
  readonly busqueda = signal('');

  /** Socios activos primero, luego orden alfabético; busca por nombre. */
  readonly listaSocios = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const anioStr = String(this.anio());
    return this.gym
      .personas()
      .map((p) => this.gym.estadoDe(p))
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .sort((a, b) => Number(b.activo ?? true) - Number(a.activo ?? true))
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        activo: p.activo ?? true,
        pagoMesActual: p.mesesPagados.includes(this.hoyClave),
        pagoAnioVisto: p.mesesPagados.some((m) => m.slice(0, 4) === anioStr),
      }));
  });

  readonly socioSeleccionado = computed<PersonaConEstado | null>(() => {
    const id = this.socioId();
    if (!id) return null;
    const p = this.gym.personas().find((x) => x.id === id);
    return p ? this.gym.estadoDe(p) : null;
  });

  /** Grilla de los 12 meses del año visto, con estado actual/futuro. */
  readonly mesesDelAnio = computed<MesGrilla[]>(() => {
    const anio = this.anio();
    const hoyClave = this.hoyClave;
    return NOMBRES_MESES.map((nombre, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const clave = `${anio}-${mm}`;
      return {
        clave,
        nombre,
        corto: nombre.slice(0, 3),
        actual: clave === hoyClave,
        futuro: clave > hoyClave,
      };
    });
  });

  /** Meses pagados por el socio seleccionado dentro del año visto (desc). */
  readonly mesesPagadosAnio = computed<string[]>(() => {
    const s = this.socioSeleccionado();
    const anio = String(this.anio());
    return s ? s.mesesPagados.filter((m) => m.slice(0, 4) === anio).sort((a, b) => b.localeCompare(a)) : [];
  });

  readonly esAnioActual = computed(() => this.anio() === Number(this.hoyClave.slice(0, 4)));

  constructor() {
    addIcons({
      walletOutline, calendarClearOutline, checkmarkCircle, chevronBackOutline,
      chevronForwardOutline, personOutline, searchOutline, closeCircleOutline,
    });
  }

  anioAnterior(): void {
    // No tiene sentido revisar pagos de antes de que existiera el gimnasio.
    if (this.anio() > 2000) this.anio.update((a) => a - 1);
  }

  anioSiguiente(): void {
    this.anio.update((a) => a + 1);
  }

  onBusqueda(ev: CustomEvent): void {
    this.busqueda.set((ev.detail as { value?: string }).value ?? '');
  }

  seleccionar(id: string): void {
    this.socioId.set(id);
  }

  estaPagado(mes: string): boolean {
    return this.mesesPagadosAnio().includes(mes);
  }

  /** Marca o desmarca el pago del mes tocado en la grilla. Los meses futuros no se tocan. */
  togglePago(mes: MesGrilla, checked: boolean): void {
    const id = this.socioId();
    if (!id || mes.futuro) return;
    if (checked) {
      this.gym.registrarPago(id, mes.clave);
      void this.aviso(`Pago registrado: ${mes.nombre} ${this.anio()}`, 'success');
    } else {
      this.gym.quitarPago(id, mes.clave);
      void this.aviso(`Se quitó el pago de ${mes.nombre} ${this.anio()}`, 'medium');
    }
  }

  nombreMes(clave: string): string {
    const mes = Number(clave.slice(5, 7));
    return NOMBRES_MESES[mes - 1] ?? clave;
  }

  /** Nombres cortos de los meses pagados en el año visto, para el texto de ayuda. */
  nombresMesesPagados(): string {
    return this.mesesPagadosAnio()
      .map((clave) => this.nombreMes(clave).slice(0, 3))
      .join(', ');
  }

  /** Resumen del socio en la cabecera de la grilla. */
  formatearResumen(s: PersonaConEstado): string {
    const [y, m, d] = s.fechaVencimiento.split('-');
    const pagos = s.mesesPagados.filter((mm) => mm.slice(0, 4) === String(this.anio())).length;
    const vence = d && m && y ? `${d}/${m}/${y}` : s.fechaVencimiento;
    return `Cuota vigente hasta ${vence} · ${pagos} ${pagos === 1 ? 'pago' : 'pagos'} en ${this.anio()}`;
  }

  /** Texto tipo "Ene, Mar y Abr" para el último pago dentro del año visto. */
  textoUltimoPago(p: { pagoAnioVisto: boolean; id: string }): string {
    if (!p.pagoAnioVisto) return 'Sin pagos este año';
    const meses = this.gym
      .pagosDe(p.id)
      .filter((x) => x.mes.slice(0, 4) === String(this.anio()))
      .sort((a, b) => b.mes.localeCompare(a.mes));
    if (meses.length === 0) return 'Sin pagos este año';
    const etiquetas = meses.slice(0, 3).map((x) => this.nombreMes(x.mes).slice(0, 3));
    return `Último pago: ${etiquetas.join(', ')}${meses.length > 3 ? '…' : ''}`;
  }

  private async aviso(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 1600, color, position: 'top' });
    await toast.present();
  }
}
