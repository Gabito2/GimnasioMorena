import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab2Page } from './tab2.page';
import { GymService } from '../services/gym.service';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;
  let gym: GymService;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem(
      'gym-morena-personas',
      JSON.stringify([
        {
          id: 's1',
          nombre: 'Juan Perez',
          telefono: '3515551234',
          fechaIngreso: '2026-01-01',
          montoCuota: 1000,
          fechaVencimiento: '2026-01-01',
        },
      ]),
    );
    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    gym = TestBed.inject(GymService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra los últimos pagos con el nombre del mes', () => {
    gym.registrarPago('s1', '2026-09');
    gym.registrarPago('s1', '2026-10');

    expect(component.ultimosPagos(component.filtrados()[0])).toBe('Oct 2026 · Sep 2026');
  });

  it('da de baja al socio desde la ficha', () => {
    const p = component.filtrados()[0];
    component.seleccionar(p);
    component.pedirBaja(p);

    const cfg = component.alerta();
    expect(cfg).toBeTruthy();
    (cfg!.buttons[1] as { handler: () => void }).handler();

    expect(gym.personas()[0].activo).toBe(false);
    expect(component.seleccionado()).toBeNull();
  });
});
