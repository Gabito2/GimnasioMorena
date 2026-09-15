import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonCard, IonCardContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barbellOutline, peopleOutline, alarmOutline, statsChartOutline, downloadOutline, addCircleOutline,
} from 'ionicons/icons';
import { GymService } from '../services/gym.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonCard, IonCardContent,
  ],
})
export class Tab1Page {
  private gym = inject(GymService);
  private router = inject(Router);

  readonly mensajeDelDia = [
    'La disciplina es el puente entre metas y logros. ¡Hoy es un gran día para entrenar!',
    'El cuerpo logra lo que la mente cree. ¡Seguí esforzándote!',
    'Sin dolor no hay progreso. ¡Sumá un día más de esfuerzo!',
    'El único mal entrenamiento es el que no se hizo. ¡Nos vemos en el gym!',
    'No cuentes los días, hacé que los días cuenten. ¡Vamos que se puede!',
    'Cada repeticion te acerca a tu mejor versión. ¡Fuerza!',
  ][new Date().getDate() % 6];

  constructor() {
    addIcons({ barbellOutline, peopleOutline, alarmOutline, statsChartOutline, downloadOutline, addCircleOutline });
  }

  get vencidos(): number {
    return this.gym.personas().filter((p) => GymService.diasRestantes(p.fechaVencimiento) < 0).length;
  }

  get porVencer(): number {
    return this.gym.personas().filter((p) => {
      const d = GymService.diasRestantes(p.fechaVencimiento);
      return d >= 0 && d <= 5;
    }).length;
  }

  get total(): number {
    return this.gym.personas().length;
  }

  irRegistrar(): void {
    void this.router.navigate(['/tabs/tab3']);
  }

  irVencimientos(): void {
    void this.router.navigate(['/tabs/tab2']);
  }

  irEstadisticas(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  irBackup(): void {
    void this.router.navigate(['/tabs/tab5']);
  }
}
