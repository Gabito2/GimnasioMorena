import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonChip, IonIcon, IonButton, IonAvatar, IonAlert,
  IonFab, IonFabButton,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline, callOutline, refreshOutline, trashOutline, searchOutline, alertCircleOutline, checkmarkCircleOutline, timeOutline,
} from 'ionicons/icons';
import { GymService, PersonaConEstado, EstadoCuota } from '../services/gym.service';

type Filtro = 'todos' | 'al-dia' | 'por-vencer' | 'vencido';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonChip, IonIcon, IonButton, IonAvatar, IonAlert, IonFab, IonFabButton,
  ],
})
export class Tab2Page {
  private gym = inject(GymService);
  private router = inject(Router);

  readonly busqueda = signal('');
  readonly filtro = signal<Filtro>('todos');

  readonly conEstado = computed(() => this.gym.personas().map((p) => this.gym.estadoDe(p)));

  readonly filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const f = this.filtro();
    return this.conEstado()
      .filter((p) => (f === 'todos' ? true : p.estado === f))
      .filter((p) => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q))
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  });

  readonly alertaRenovar = signal<{ header: string; message: string; buttons: any[]; inputs?: any[] } | null>(null);
  readonly alertaEliminar = signal<{ header: string; message: string; buttons: any[] } | null>(null);

  gymTotal(): number {
    return this.gym.personas().length;
  }

  pedirEliminar(p: PersonaConEstado): void {
    this.alertaEliminar.set({
      header: 'Eliminar socio',
      message: `¿Eliminar a ${p.nombre} ${p.apellido}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.gym.eliminar(p.id),
        },
      ],
    });
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
      alertCircleOutline, checkmarkCircleOutline, timeOutline,
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

  cambiarFiltroDesdeChip(estado: EstadoCuota): void {
    this.filtro.set(estado);
  }

  irRegistrar(): void {
    void this.router.navigate(['/tabs/tab3']);
  }

  pedirRenovar(p: PersonaConEstado): void {
    this.alertaRenovar.set({
      header: 'Renovar cuota',
      message: `¿Cobrar y renovar la cuota de ${p.nombre} ${p.apellido}? La nueva fecha de vencimiento será un mes después.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cobrar y renovar',
          role: 'confirm',
          handler: () => {
            this.gym.renovarCuota(p.id);
          },
        },
      ],
    });
  }

  cerrarAlerta(): void {
    this.alertaRenovar.set(null);
  }
}
