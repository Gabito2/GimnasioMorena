import { Component, computed, inject } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonList, IonItem, IonLabel, IonNote,
  IonCard, IonCardContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline, checkmarkCircleOutline, alertCircleOutline, calendarOutline,
  cashOutline, trendingUpOutline, personOutline,
} from 'ionicons/icons';
import { GymService, EstadoCuota } from '../services/gym.service';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonList, IonItem, IonLabel, IonNote,
    IonCard, IonCardContent,
  ],
})
export class Tab4Page {
  private gym = inject(GymService);

  readonly conEstado = computed(() => this.gym.personas().map((p) => this.gym.estadoDe(p)));

  readonly total = computed(() => this.conEstado().length);
  readonly alDia = computed(() => this.conEstado().filter((p) => p.estado === 'al-dia').length);
  readonly porVencer = computed(() => this.conEstado().filter((p) => p.estado === 'por-vencer').length);
  readonly vencidos = computed(() => this.conEstado().filter((p) => p.estado === 'vencido').length);

  /** Cuotas que vencen dentro de los próximos 7 días (incluye hoy). */
  readonly vencenEstaSemana = computed(
    () => this.conEstado().filter((p) => p.diasRestantes >= 0 && p.diasRestantes <= 7).length,
  );

  /** Ingresos del mes corriente según pagos registrados (renovaciones y altas con cuota al día). */
  readonly ingresosMes = computed(() => {
    const mesActual = GymService.hoyISO().slice(0, 7); // yyyy-MM
    return this.gym.personas()
      .filter((p) => p.fechaVencimiento.slice(0, 7) >= mesActual) // cuota vigente = pagada
      .reduce((sum, p) => sum + (p.montoCuota || 0), 0);
  });

  readonly moraEstimada = computed(
    () => this.conEstado().filter((p) => p.estado === 'vencido').reduce((sum, p) => sum + (p.montoCuota || 0), 0),
  );

  readonly proximosVencer = computed(() =>
    this.conEstado()
      .filter((p) => p.estado === 'por-vencer')
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5),
  );

  readonly vencidosLista = computed(() =>
    this.conEstado()
      .filter((p) => p.estado === 'vencido')
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5),
  );

  readonly porcentajeAlDia = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.alDia() / this.total()) * 100),
  );

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
      cashOutline, trendingUpOutline, personOutline,
    });
  }
}
