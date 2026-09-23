import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonInput,
  IonButton, IonNote, IonIcon, IonText, IonSpinner,
} from '@ionic/angular';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, callOutline, cashOutline, calendarOutline, saveOutline, personAddOutline } from 'ionicons/icons';
import { GymService } from '../services/gym.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonInput,
    IonButton, IonNote, IonIcon, IonText, IonSpinner,
  ],
})
export class Tab3Page {
  private gym = inject(GymService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private fb = inject(NonNullableFormBuilder);

  readonly guardando = signal(false);
  readonly fechaIngresoISO = GymService.hoyISO();
  readonly hoyISO = GymService.hoyISO();

  /** Montos frecuentes para carga con un toque. */
  readonly montosRapidos = [15000, 20000, 25000, 30000] as const;
  readonly montoSeleccionado = signal<number | null>(null);

  /** Primera vencimiento estimado: ingreso + 30 días. */
  get primeraVencimiento(): string {
    const base = this.form.controls.fechaIngreso.value || this.fechaIngresoISO;
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.pattern(/^[0-9+\-\s()]{6,20}$/)]],
    fechaIngreso: [GymService.hoyISO(), Validators.required],
    montoCuota: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    addIcons({ personOutline, callOutline, cashOutline, calendarOutline, saveOutline, personAddOutline });
  }
  /** Atajo para los montos frecuentes. Tocar de nuevo deselecciona. */
  setMonto(monto: number): void {
    if (this.montoSeleccionado() === monto) {
      this.montoSeleccionado.set(null);
      return;
    }
    this.montoSeleccionado.set(monto);
    this.form.controls.montoCuota.setValue(monto);
    this.form.controls.montoCuota.markAsTouched();
  }

  cancelar(): void {
    void this.router.navigate(['/tabs/tab2']);
  }

  onFechaIngresoChange(ev: CustomEvent): void {
    const valor = (ev.detail as { value?: string | string[] }).value;
    const iso = Array.isArray(valor) ? valor[0] : valor;
    if (iso) this.form.controls.fechaIngreso.setValue(iso.slice(0, 10));
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);

    const v = this.form.getRawValue();
    const fechaIngreso = v.fechaIngreso.slice(0, 10);
    const venc = new Date(fechaIngreso + 'T00:00:00');
    venc.setDate(venc.getDate() + 30);

    this.gym.agregar({
      nombre: v.nombre.trim().replace(/\s+/g, ' '),
      telefono: v.telefono.trim(),
      fechaIngreso,
      montoCuota: Number(v.montoCuota) || 0,
      fechaVencimiento: venc.toISOString().slice(0, 10),
    });

    const toast = await this.toastCtrl.create({
      message: `${v.nombre.trim()} registrado. Cuota vence el ${this.formatear(venc.toISOString().slice(0, 10))}`,
      duration: 2600,
      color: 'success',
      position: 'top',
    });
    await toast.present();

    this.form.reset({
      nombre: '',
      telefono: '',
      fechaIngreso: GymService.hoyISO(),
      montoCuota: 0,
    });
    this.montoSeleccionado.set(null);
    this.guardando.set(false);
    void this.router.navigate(['/tabs/tab2']);
  }

  formatearPreview(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  private formatear(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
}
