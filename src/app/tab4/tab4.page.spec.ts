import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab4Page } from './tab4.page';
import { GymService } from '../services/gym.service';

describe('Tab4Page — ingresos del mes', () => {
  let fixture: ComponentFixture<Tab4Page>;
  let gym: GymService;

  const persona = {
    id: 's1',
    nombre: 'Juan Perez',
    telefono: '',
    fechaIngreso: '2026-01-01',
    montoCuota: 1000,
    fechaVencimiento: '2026-01-01',
  };

  beforeEach(() => {
    localStorage.clear();
    fixture = TestBed.createComponent(Tab4Page);
    gym = TestBed.inject(GymService);
  });

  it('suma solo los pagos registrados en el mes corriente de socios activos', () => {
    const mes = GymService.hoyISO().slice(0, 7);
    gym.reemplazarTodo(
      [persona],
      [
        { id: 'p1', personaId: 's1', mes, fecha: '2026-01-01', monto: 1500 },
        { id: 'p2', personaId: 's1', mes: '2000-01', fecha: '2026-01-01', monto: 9999 },
      ],
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.ingresosMes()).toBe(1500);
  });

  it('no cuenta los pagos de socios dados de baja', () => {
    const mes = GymService.hoyISO().slice(0, 7);
    gym.reemplazarTodo([{ ...persona, activo: false }], [
      { id: 'p1', personaId: 's1', mes, fecha: '2026-01-01', monto: 1500 },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.ingresosMes()).toBe(0);
  });
});
