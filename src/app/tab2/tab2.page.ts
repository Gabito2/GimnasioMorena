import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonChip, IonIcon, IonButton, IonAvatar, IonAlert, IonCheckbox,
  IonFab, IonFabButton, IonModal, IonButtons, IonInput, IonNote, IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline, callOutline, refreshOutline, trashOutline, searchOutline, alertCircleOutline,
  checkmarkCircleOutline, timeOutline, add, logoWhatsapp, checkmarkDoneOutline,
  createOutline, closeCircleOutline, chatbubbleEllipsesOutline, walletOutline, personAddOutline,
} from 'ionicons/icons';
import { GymService, PersonaConEstado, EstadoCuota } from '../services/gym.service';

type Filtro = 'todos' | 'al-dia' | 'por-vencer' | 'vencido';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonChip, IonIcon, IonButton, IonAvatar, IonAlert, IonCheckbox,
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

  readonly alertaRenovar = signal<{ header: string; message: string; buttons: any[] } | null>(null);
  readonly alertaEliminar = signal<{ header: string; message: string; buttons: any[] } | null>(null);
  readonly alertaPago = signal<{ header: string; message: string; buttons: any[] } | null>(null);

  /** Socio seleccionado: abre el modal de detalle (null = cerrado). */
  readonly seleccionado = signal<PersonaConEstado | null>(null);
  /** true cuando el detalle está en modo edición. */
  readonly editando = signal(false);
  readonly nombreEdit = signal('');
  readonly telefonoEdit = signal('');
  readonly montoEdit = signal('');
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
      personOutline, callOutline, refreshOutline, trashOutline, searchOutline,
      alertCircleOutline, checkmarkCircleOutline, timeOutline, add,
      logoWhatsapp, checkmarkDoneOutline, createOutline, closeCircleOutline,
      chatbubbleEllipsesOutline, walletOutline, personAddOutline,
    });
  }

  onBusqueda(ev: CustomEvent): void {
    this.busqueda.set((ev.detail as { value?: string }).value ?? '');
  }

  onFiltro(ev: CustomEvent): void {
    this.filtro.set((ev.detail as { value: string }).value as Filtro);
  }

  formatearFecha(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
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
    this.gym.actualizar({ ...p, nombre, telefono, montoCuota: monto });
    this.seleccionado.set(this.gym.estadoDe({ ...p, nombre, telefono, montoCuota: monto }));
    this.editando.set(false);
    this.errorEdicion.set('');
  }

  pedirRenovar(p: PersonaConEstado): void {
    this.alertaRenovar.set({
      header: 'Renovar cuota',
      message: `¿Cobrar y renovar la cuota de ${p.nombre}? La nueva fecha de vencimiento será un mes después.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cobrar y renovar',
          role: 'confirm',
          handler: () => {
            this.gym.renovarCuota(p.id);
            this.refrescarSeleccionado(p.id);
          },
        },
      ],
    });
  }

  /** Marca / desmarca el pago del mes corriente. Al marcar, ofrece avisar por WhatsApp. */
  togglePago(p: PersonaConEstado, marcado: boolean): void {
    if (marcado) {
      this.gym.marcarPagado(p.id);
      this.refrescarSeleccionado(p.id);
      this.alertaPago.set({
        header: 'Cuota registrada',
        message: `Se marcó el pago de ${p.nombre} del mes y se renovó su vencimiento. ¿Querés avisarle por WhatsApp?`,
        buttons: [
          { text: 'No, gracias', role: 'cancel' },
          {
            text: 'Avisar por WhatsApp',
            role: 'confirm',
            handler: () => this.enviarGracias(p.id),
          },
        ],
      });
    } else {
      this.gym.desmarcarPagado(p.id);
      this.refrescarSeleccionado(p.id);
    }
  }

  /** Abre WhatsApp con el mensaje estándar de recordatorio de cuota. */
  enviarRecordatorio(p: PersonaConEstado): void {
    this.gym.enviarWhatsApp(p.telefono, GymService.mensajeRecordatorio(p.nombre, p.fechaVencimiento, p.montoCuota));
  }

  private enviarGracias(personaId: string): void {
    const p = this.gym.personas().find((x) => x.id === personaId);
    if (p) this.gym.enviarWhatsApp(p.telefono, GymService.mensajeGracias(p.nombre, p.montoCuota));
  }

  pedirBaja(p: PersonaConEstado): void {
    this.alertaEliminar.set({
      header: 'Dar de baja',
      message: `¿Dar de baja a ${p.nombre}? Va a quedar fuera del listado, pero se conserva su historial de pagos y podés reactivarlo desde Estadísticas.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Dar de baja',
          role: 'destructive',
          handler: () => {
            this.gym.darBaja(p.id);
            this.cerrarDetalle();
          },
        },
      ],
    });
  }

  /** Elimina al socio y todo su historial (opción secundaria, con confirmación fuerte). */
  pedirEliminar(p: PersonaConEstado): void {
    this.alertaEliminar.set({
      header: 'Eliminar definitivamente',
      message: `¿ELIMINAR a ${p.nombre} y todo su historial de pagos? Esta acción no se puede deshacer. Si solo dejó el gimnasio, usá "Dar de baja".`,
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

  private refrescarSeleccionado(personaId: string): void {
    const actual = this.gym.personas().find((x) => x.id === personaId);
    if (actual && this.seleccionado()?.id === personaId) {
      this.seleccionado.set(this.gym.estadoDe(actual));
    }
  }

  cerrarAlerta(): void {
    this.alertaRenovar.set(null);
  }
}
