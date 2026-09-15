import { Component, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonCard,
  IonCardContent, IonCardHeader, IonCardTitle, IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  downloadOutline, cloudUploadOutline, saveOutline, documentTextOutline,
  peopleOutline, warningOutline, checkmarkDoneOutline,
} from 'ionicons/icons';
import { GymService } from '../services/gym.service';

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonCard,
    IonCardContent, IonCardHeader, IonCardTitle, IonNote,
  ],
})
export class Tab5Page {
  private gym = inject(GymService);
  private toastCtrl = inject(ToastController);

  readonly totalSocios = computed(() => this.gym.personas().length);
  readonly importando = signal(false);

  constructor() {
    addIcons({
      downloadOutline, cloudUploadOutline, saveOutline, documentTextOutline,
      peopleOutline, warningOutline, checkmarkDoneOutline,
    });
  }

  /** Descarga un archivo .json con todos los datos. */
  exportar(): void {
    if (this.totalSocios() === 0) {
      void this.aviso('No hay datos para exportar', 'warning');
      return;
    }
    const contenido = this.gym.exportarJSON();
    const fecha = GymService.hoyISO();
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-morena-backup-${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    void this.aviso('Copia de seguridad descargada', 'success');
  }

  /** Lee el archivo seleccionado y reemplaza los datos actuales. */
  async importar(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite reimportar el mismo archivo
    if (!archivo) return;

    if (!archivo.name.toLowerCase().endsWith('.json')) {
      void this.aviso('Seleccioná un archivo .json exportado por la app', 'danger');
      return;
    }

    this.importando.set(true);
    try {
      const texto = await archivo.text();
      const cantidad = this.gym.importarJSON(texto);
      void this.aviso(`Importación exitosa: ${cantidad} socios cargados`, 'success');
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo importar el archivo';
      void this.aviso(mensaje, 'danger');
    } finally {
      this.importando.set(false);
    }
  }

  private async aviso(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2400, color, position: 'top' });
    await toast.present();
  }
}
