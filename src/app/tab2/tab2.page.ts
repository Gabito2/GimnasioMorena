import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonChip, IonIcon, IonButton, IonAvatar, IonAlert,
  IonFab, IonFabButton, IonModal, IonButtons, IonInput, IonNote, IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline, callOutline, trashOutline, searchOutline, alertCircleOutline,
  checkmarkCircleOutline, timeOutline, add, logoWhatsapp, checkmarkDoneOutline,
  createOutline, walletOutline, calendarOutline, calendarClearOutline, cashOutline,
} from 'ionicons/icons';
import { GymService, Persona, PersonaConEstado, EstadoCuota } from '../services/gym.service';

type Filtro = 'todos' | 'al-dia' | 'por-vencer' | 'vencido';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonChip, IonIcon, IonButton, IonAvatar, IonAlert,
    IonFab, IonFabButton, IonModal, IonButtons, IonInput, IonNote, IonText,
  ],
})
export class Tab2Page {
  private gym = inject(GymService);
  private router = inject(Router);

  readonly busqueda = signal('');
  readonly filtro = signal<Filtro>('todos');

  readonly conEstado = computed(() =>
    this.gym
      .personas()
      .filter((p) => p.activo !== false) // los de baja se gestionan desde Estadísticas
      .map((p) => this.gym.estadoDe(p)),
  );

  readonly filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const f = this.filtro();
    return this.conEstado()
      .filter((p) => (f === 'todos' ? true : p.estado === f))
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  });

  readonly alertaEliminar = signal<{ header: string; message: string; buttons: unknown[] } | null>(null);

  /** Socio seleccionado: abre el modal de detalle (null = cerrado). */
  readonly seleccionado = signal<PersonaConEstado | null>(null);
  /** true cuando el detalle está en modo edición. */
  readonly editando = signal(false);
  readonly nombreEdit = signal('');
  readonly telefonoEdit = signal('');
  readonly montoEdit = signal('');
  readonly fechaIngresoEdit = signal('');
  readonly fechaVencimientoEdit = signal('');
  readonly errorEdicion = signal('');

  gymTotal(): number {
    return this.gym.personas().length;
  }

  readonly claseEstado: Record<EstadoCuota, string> = {
    'al-dia': 'verde',
    'por-vencer': 'amarillo',
    'vencido': 'rojo',
  };
  readonly iconoEstado: Record<EstadoCuota, string> = {
    'al-dia': 'checkmark-circle-outline',
    'por-vencer': 'time-outline',
    'vencido': 'alert-circle-outline',
  };

  constructor() {
    addIcons({
      personOutline, callOutline, trashOutline, searchOutline,
      alertCircleOutline, checkmarkCircleOutline, timeOutline, add,
      logoWhatsapp, checkmarkDoneOutline,      createOutline, walletOutline,
      calendarOutline, calendarClearOutline, cashOutline,
    });
  }

  onBusqueda(ev: CustomEvent): void {
    this.busqueda.set((ev.detail as { value?: string }).value ?? '');
  }

  onFiltro(ev: CustomEvent): void {
    this.filtro.set((ev.detail as { value: string }).value as Filtro);
  }

  formatearFecha(iso: string): string {
    const [y, m, d] = (iso ?? '').split('-');
    return y && m && d ? `${d}/${m}/${y}` : '—';
  }

  formatearMonto(n: number): string {
    return '$' + (n || 0).toLocaleString('es-AR');
  }

  cambiarFiltroDesdeChip(estado: EstadoCuota): void {
    this.filtro.set(estado);
  }

  irRegistrar(): void {
    void this.router.navigate(['/tabs/tab3']);
  }

  seleccionar(p: PersonaConEstado): void {
    this.seleccionado.set(p);
    this.editando.set(false);
    this.errorEdicion.set('');
  }

  cerrarDetalle(): void {
    this.seleccionado.set(null);
    this.editando.set(false);
  }

  empezarEditar(): void {
    const p = this.seleccionado();
    if (!p) return;
    this.nombreEdit.set(p.nombre);
    this.telefonoEdit.set(p.telefono);
    this.montoEdit.set(String(p.montoCuota));
    this.fechaIngresoEdit.set(p.fechaIngreso);
    this.fechaVencimientoEdit.set(p.fechaVencimiento);
    this.errorEdicion.set('');
    this.editando.set(true);
  }

  cancelarEditar(): void {
    this.editando.set(false);
    this.errorEdicion.set('');
  }

  guardarEdicion(): void {
    const p = this.seleccionado();
    if (!p) return;
    const nombre = this.nombreEdit().trim().replace(/\s+/g, ' ');
    const telefono = this.telefonoEdit().trim();
    const monto = Number(this.montoEdit());
    const fechaIngreso = this.fechaIngresoEdit().slice(0, 10);
    const fechaVencimiento = this.fechaVencimientoEdit().slice(0, 10);
    if (nombre.length < 2) {
      this.errorEdicion.set('El nombre debe tener al menos 2 letras');
      return;
    }
    if (telefono && !/^[0-9+\-\s()]{6,20}$/.test(telefono)) {
      this.errorEdicion.set('El teléfono tiene caracteres no válidos');
      return;
    }
    if (isNaN(monto) || monto < 0) {
      this.errorEdicion.set('Ingresá un monto válido');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIngreso) || isNaN(new Date(fechaIngreso).getTime())) {
      this.errorEdicion.set('Ingresá una fecha de ingreso válida');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento) || isNaN(new Date(fechaVencimiento).getTime())) {
      this.errorEdicion.set('Ingresá una fecha de vencimiento válida');
      return;
    }
    // Se guarda solo la Persona: los campos derivados (estado, mesesPagados…)
    // se recalculan y no deben persistirse en localStorage.
    const actualizado: Persona = {
      id: p.id,
      nombre,
      telefono,
      montoCuota: monto,
      fechaIngreso,
      fechaVencimiento,
      activo: p.activo,
    };
    this.gym.actualizar(actualizado);
    this.seleccionado.set(this.gym.estadoDe(actualizado));
    this.editando.set(false);
    this.errorEdicion.set('');
  }

  /** Abre WhatsApp con el mensaje estándar de recordatorio de cuota. */
  enviarRecordatorio(p: PersonaConEstado): void {
    this.gym.enviarWhatsApp(p.telefono, GymService.mensajeRecordatorio(p.nombre, p.fechaVencimiento, p.montoCuota));
  }

  /** Elimina al socio y todo su historial, con confirmación. */
  pedirEliminar(p: PersonaConEstado): void {
    this.alertaEliminar.set({
      header: 'Eliminar socio',
      message: `¿Eliminar a ${p.nombre} y todo su historial de pagos? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar todo',
          role: 'destructive',
          handler: () => {
            this.gym.eliminar(p.id);
            this.cerrarDetalle();
          },
        },
      ],
    });
  }

}
