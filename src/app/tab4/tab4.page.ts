import { Component, computed, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonList, IonItem, IonLabel, IonNote,
  IonCard, IonCardContent, IonButton,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline, checkmarkCircleOutline, alertCircleOutline, calendarOutline,
  cashOutline, trendingUpOutline, personOutline, personRemoveOutline, refreshCircleOutline,
} from 'ionicons/icons';
import { GymService, EstadoCuota, PersonaConEstado } from '../services/gym.service';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonList, IonItem, IonLabel, IonNote,
    IonCard, IonCardContent, IonButton,
  ],
})
export class Tab4Page {
  private gym = inject(GymService);
  private toastCtrl = inject(ToastController);

  /** Todos los socios con estado (incluye los de baja). */
  readonly conEstado = computed(() => this.gym.personas().map((p) => this.gym.estadoDe(p)));

  /** Solo socios activos: las métricas del gimnasio cuentan gente que entrena. */
  readonly activos = computed(() => this.conEstado().filter((p) => p.activo !== false));

  /** Socios con baja lógica, para poder reactivarlos. */
  readonly deBaja = computed(() => this.conEstado().filter((p) => p.activo === false));

  readonly total = computed(() => this.activos().length);
  readonly alDia = computed(() => this.activos().filter((p) => p.estado === 'al-dia').length);
  readonly porVencer = computed(() => this.activos().filter((p) => p.estado === 'por-vencer').length);
  readonly vencidos = computed(() => this.activos().filter((p) => p.estado === 'vencido').length);

  /** Cuotas que vencen dentro de los próximos 7 días (incluye hoy). */
  readonly vencenEstaSemana = computed(
    () => this.activos().filter((p) => p.diasRestantes >= 0 && p.diasRestantes <= 7).length,
  );

  /** Ingresos del mes corriente según pagos registrados (solo socios activos). */
  readonly ingresosMes = computed(() => {
    const mesActual = GymService.hoyISO().slice(0, 7); // yyyy-MM
    return this.activos()
      .filter((p) => p.fechaVencimiento.slice(0, 7) >= mesActual) // cuota vigente = pagada
      .reduce((sum, p) => sum + (p.montoCuota || 0), 0);
  });

  readonly moraEstimada = computed(
    () => this.activos().filter((p) => p.estado === 'vencido').reduce((sum, p) => sum + (p.montoCuota || 0), 0),
  );

  readonly proximosVencer = computed(() =>
    this.activos()
      .filter((p) => p.estado === 'por-vencer')
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5),
  );

  readonly vencidosLista = computed(() =>
    this.activos()
      .filter((p) => p.estado === 'vencido')
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5),
  );

  readonly porcentajeAlDia = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.alDia() / this.total()) * 100),
  );

  /** Reactiva a un socio dado de baja: vuelve a Socios, Pagos y estadísticas. */
  async reactivar(p: PersonaConEstado): Promise<void> {
    this.gym.reactivar(p.id);
    const toast = await this.toastCtrl.create({
      message: `${p.nombre} reactivado. ¡De vuelta al gimnasio! 💪`,
      duration: 2000,
      color: 'success',
      position: 'top',
    });
    await toast.present();
  }

  formatearFecha(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatearMonto(n: number): string {
    return '$' + n.toLocaleString('es-AR');
  }

  constructor() {
    addIcons({
      peopleOutline, checkmarkCircleOutline, alertCircleOutline, calendarOutline,
      cashOutline, trendingUpOutline, personOutline, personRemoveOutline, refreshCircleOutline,
    });
  }
}
