import { Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

const HOME_URL = '/tabs/tab1';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private platform = inject(Platform);
  private router = inject(Router);
  private zone = inject(NgZone);

  private backButtonSub?: { unsubscribe(): void };

  constructor() {}

  ngOnInit(): void {
    // Tema oscuro permanente (negro + amarillo): status bar con iconos claros.
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => {
      /* no-op en web */
    });

    // Interceptar el botón "atrás" de Android:
    // - Si no está en el menú (Inicio), vuelve al menú.
    // - Si ya está en el menú, cierra la app.
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(
      10,
      (processNextHandler) => {
        this.zone.run(() => {
          const url = this.router.url.split('?')[0].split('#')[0];

          if (url === HOME_URL) {
            // Ya está en el menú -> salir de la app
            void CapacitorApp.exitApp();
          } else {
            // Volver al menú (Inicio)
            void this.router.navigate([HOME_URL], {
              replaceUrl: true,
              queryParamsHandling: 'merge',
            });
          }
        });
      }
    );
  }

  ngOnDestroy(): void {
    this.backButtonSub?.unsubscribe();
  }
}
