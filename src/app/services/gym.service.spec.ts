import { TestBed } from '@angular/core/testing';
import { GymService } from './gym.service';

describe('GymService — pagos', () => {
  let service: GymService;
  /** Vencimiento a 10 días de hoy (siempre vigente, independiente de la fecha). */
  const vencFuturo = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return GymService.aISO(d);
  })();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GymService);
    service.reemplazarTodo([
      {
        id: 's1',
        nombre: 'Juan Pérez',
        telefono: '351 555 1234',
        fechaIngreso: '2026-08-01',
        montoCuota: 20000,
        fechaVencimiento: vencFuturo,
      },
    ]);
  });

  it('marcarPagado registra un pago del mes corriente y ajusta el vencimiento', () => {
    const mes = GymService.hoyISO().slice(0, 7);
    const [y, m] = mes.split('-').map(Number);
    // Vencimiento fijo el día 15 del mes corriente (test independiente de la fecha).
    service.reemplazarTodo([
      {
        id: 's1',
        nombre: 'Juan Pérez',
        telefono: '351 555 1234',
        fechaIngreso: '2026-08-01',
        montoCuota: 20000,
        fechaVencimiento: GymService.aISO(new Date(y, m - 1, 15)),
      },
    ]);
    expect(service.pagoDelMes('s1')).toBe(false);

    service.marcarPagado('s1');

    expect(service.pagoDelMes('s1')).toBe(true);
    expect(service.pagosDe('s1').length).toBe(1);
    expect(service.pagosDe('s1')[0].mes).toBe(mes);
    expect(service.pagosDe('s1')[0].monto).toBe(20000);
    // El vencimiento pasa al mismo día del mes siguiente al pago.
    expect(service.personas()[0].fechaVencimiento).toBe(GymService.aISO(new Date(y, m, 15)));
  });

  it('marcarPagado no duplica el pago si el mes ya está registrado', () => {
    service.marcarPagado('s1');
    service.marcarPagado('s1');
    expect(service.pagosDe('s1').length).toBe(1);
  });

  it('desmarcarPagado quita el registro del mes corriente', () => {
    service.marcarPagado('s1');
    service.desmarcarPagado('s1');
    expect(service.pagoDelMes('s1')).toBe(false);
    expect(service.pagosDe('s1').length).toBe(0);
  });

  it('eliminar también limpia el historial de pagos del socio', () => {
    service.marcarPagado('s1');
    service.eliminar('s1');
    expect(service.pagos().length).toBe(0);
  });

  it('exportarJSON incluye los pagos e importarJSON los restaura', () => {
    service.marcarPagado('s1');
    const backup = service.exportarJSON();
    service.reemplazarTodo([]);
    const cantidad = service.importarJSON(backup);
    expect(cantidad).toBe(1);
    expect(service.pagoDelMes('s1')).toBe(true);
  });

  it('registrarPago ajusta el vencimiento al mes siguiente del último mes pago', () => {
    service.reemplazarTodo([
      {
        id: 's1',
        nombre: 'Juan Pérez',
        telefono: '',
        fechaIngreso: '2026-01-15',
        montoCuota: 20000,
        fechaVencimiento: '2026-10-15',
      },
    ]);

    service.registrarPago('s1', '2026-03');
    expect(service.estaPagado('s1', '2026-03')).toBe(true);
    expect(service.personas()[0].fechaVencimiento).toBe('2026-04-15');

    // Un pago más nuevo corre el vencimiento otro mes (nunca más de un mes adelante).
    service.registrarPago('s1', '2026-05');
    expect(service.personas()[0].fechaVencimiento).toBe('2026-06-15');

    // Al quitar el último pago, vuelve al mes siguiente del pago anterior.
    service.quitarPago('s1', '2026-05');
    expect(service.personas()[0].fechaVencimiento).toBe('2026-04-15');
  });

  it('corrige un vencimiento muy adelantado al marcar el pago del mes', () => {
    const mes = GymService.hoyISO().slice(0, 7);
    const [y, m] = mes.split('-').map(Number);
    // Vencimiento ~3 meses adelante (el caso de "faltan 91 días").
    service.reemplazarTodo([
      {
        id: 's1',
        nombre: 'Juan Pérez',
        telefono: '',
        fechaIngreso: '2026-01-15',
        montoCuota: 20000,
        fechaVencimiento: GymService.aISO(new Date(y, m + 2, 15)),
      },
    ]);

    service.registrarPago('s1', mes);

    expect(service.personas()[0].fechaVencimiento).toBe(GymService.aISO(new Date(y, m, 15)));
  });

  it('registrarPago ignora meses con formato inválido o ya pagados', () => {
    service.registrarPago('s1', 'marzo-2026');
    expect(service.pagosDe('s1').length).toBe(0);
    service.registrarPago('s1', '2026-03');
    service.registrarPago('s1', '2026-03');
    expect(service.pagosDe('s1').length).toBe(1);
  });

  it('quitarPago elimina el registro del mes indicado', () => {
    service.registrarPago('s1', '2026-03');
    service.quitarPago('s1', '2026-03');
    expect(service.estaPagado('s1', '2026-03')).toBe(false);
  });

  it('darBaja y reactivar alternan el estado activo del socio', () => {
    expect(service.personas()[0].activo).toBe(true);
    service.darBaja('s1');
    expect(service.personas()[0].activo).toBe(false);
    service.reactivar('s1');
    expect(service.personas()[0].activo).toBe(true);
  });

  it('estadoDe incluye mesesPagados y pagosAnio', () => {
    service.registrarPago('s1', '2026-02');
    const estado = service.estadoDe(service.personas()[0]);
    expect(estado.mesesPagados).toContain('2026-02');
    expect(estado.pagosAnio).toBeGreaterThanOrEqual(1);
  });
});

describe('GymService — WhatsApp', () => {
  it('mensajeRecordatorio incluye nombre, fecha y monto', () => {
    const msg = GymService.mensajeRecordatorio('Juan Pérez', '2026-09-30', 20000);
    expect(msg).toContain('Juan Pérez');
    expect(msg).toContain('30/09/2026');
    expect(msg).toContain('$20.000');
  });

  it('mensajeGracias confirma el pago con el monto', () => {
    const msg = GymService.mensajeGracias('Juan Pérez', 15000);
    expect(msg).toContain('Juan Pérez');
    expect(msg).toContain('$15.000');
  });

  it('normalizarTelefono agrega el prefijo de Argentina', () => {
    expect(GymService.normalizarTelefono('351 555 1234')).toBe('543515551234');
    expect(GymService.normalizarTelefono('0351 555 1234')).toBe('543515551234');
    expect(GymService.normalizarTelefono('+543515551234')).toBe('543515551234');
  });

  it('urlWhatsApp genera el enlace wa.me con mensaje codificado', () => {
    const url = GymService.urlWhatsApp('3515551234', 'Hola Juan!');
    expect(url).toBe('https://wa.me/543515551234?text=Hola%20Juan!');
  });

  it('urlWhatsApp devuelve null sin teléfono', () => {
    expect(GymService.urlWhatsApp('', 'Hola!')).toBeNull();
  });
});
