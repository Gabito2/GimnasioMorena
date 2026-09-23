# Project Knowledge — Gimnasio Morena

## What this is
**Gimnasio Morena** (`com.gymmorena`) — an Ionic 9 / Angular 22 standalone-component app for managing gym members (socios) and their monthly fees (cuotas). Data is stored entirely in `localStorage` (no backend). Ships as an Android app via Capacitor 8 (`android/` folder, splash screens included).

## Commands
```bash
npm install          # install deps
npm start            # dev server (ng serve) — http://localhost:8100
npm run build        # production build → output in www/
npm run watch        # build in dev config, watch mode
npm test             # unit tests (ng test — vitest + jsdom, setup file src/test-setup.ts)
npm run lint         # eslint (angular-eslint) over src/**/*.ts and src/**/*.html
```

### Android
```bash
npm run build && npx cap sync android   # after web build, sync to native project
npx cap open android                    # open in Android Studio
```
`www/` is the Capacitor webDir — it only exists after a build.

## Architecture
- **Entry:** `src/main.ts` (bootstrapApplication). Routes in `src/app/app.routes.ts` → lazy-loaded `tabs/tabs.routes.ts`.
- **Tabs** (bottom tab bar, `src/app/tabs/tabs.page.html`):
  - `tab1` — Inicio (home/dashboard)
  - `tab2` — Socios (member list; tapping a row opens a detail modal: edit data, dar de baja, WhatsApp, cobrar/renovar, eliminar)
  - `tab3` — Registrar (add member)
  - `tab4` — Stats
  - `tab5` — Datos (import/export JSON)
  - `tab6` — Pagos (pick a socio → year grid of 12 month tiles; tap to mark/unmark that month's payment, future months disabled; year navigation)
- **All state lives in `src/app/services/gym.service.ts`** (`GymService`, `providedIn: 'root'`):
  - Angular **signals** (`personas`, `pagos`, `hayDatos` computed) — components consume via signals, not RxJS subjects.
  - CRUD: `agregar`, `actualizar`, `eliminar`, `renovarCuota`, `reemplazarTodo`.
  - **Pagos:** `marcarPagado` (current month + renews cuota), `desmarcarPagado`, `registrarPago(id, 'yyyy-MM')` (specific month, does NOT touch vencimiento), `quitarPago`, `estaPagado`, `pagoDelMes`, `pagosDe`, `tienePagos`, `pagoEnAnio`. Each `Pago` = `{ id, personaId, mes (yyyy-MM), fecha, monto }`, stored under key `gym-morena-pagos`. Deleting a socio cleans its pagos; export/import (v2) carries pagos and drops orphans.
  - **Baja lógica:** `Persona.activo` (optional, defaults true; normalized on load/import/replace). `darBaja(id)` / `reactivar(id)`. Baja keeps data + payment history; hard delete (`eliminar`) wipes both. `estadoDe` returns `pagoMes`, `mesesPagados` (desc) and `pagosAnio`. Inactive socios are excluded from tab1 stats, tab2 list and tab4 metrics; tab4 has a "Socios de baja" section with a Reactivar button, and tab6's socio picker still lists them (with a "De baja" chip).
  - **WhatsApp:** `mensajeRecordatorio` / `mensajeGracias` (standard Spanish templates), `normalizarTelefono` (Argentina: `0`/10-digit → `54…`), `urlWhatsApp` (wa.me link), `enviarWhatsApp` (opens wa.me; toast warning if no phone). All static helpers are static on `GymService`.
  - Persistence: `localStorage` keys `gym-morena-personas` and `gym-morena-pagos`.
  - Date logic: static helpers `hoyISO`, `diasRestantes`, `sumarUnMes` (handles short months). Estado cuota: `vencido` (<0), `por-vencer` (0–5 días), `al-día` (>5).
  - JSON import/export with validation (`exportarJSON` / `importarJSON`, throws Spanish-language Errors on invalid input).

## Theme
- **Dark-only institutional theme: black + yellow.** No light mode; `index.html` sets `<html class="ion-palette-dark">` and `color-scheme: dark`.
- Palette lives in `src/theme/variables.scss`: primary `#ffd400` (yellow, black contrast), surfaces `#0a0a0b`/`#161618`. `src/global.scss` imports `@ionic/angular/css/palettes/dark.class.css` and overrides alert/modal backgrounds.
- `app.component.ts` sets the Android status bar to `Style.Dark`.
- Design tokens use the `--gm-*` prefix (see variables.scss); `--gm-gradiente` is the brand yellow gradient.

## Conventions & gotchas
- **Standalone components** everywhere (no NgModules). Ionic schematics generate with `styleext: scss`, `standalone: true`.
- TypeScript is **strict** (`strict`, `strictTemplates`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature` — index access requires bracket notation like `o['id']`, not `o.id`).
- ESLint rules: component selectors must be `app-` kebab-case; classes must end in `Page` or `Component`; directives camelCase `app` prefix.
- User-facing strings are in **Spanish** (rioplatense: usá `vos` forms) — keep new UI text and error messages in Spanish.
- Dates are handled as ISO `yyyy-MM-dd` strings, always parsed with a `T00:00:00` suffix to avoid timezone drift.
- Tests run under jsdom: don't use `toBeTrue`/`toBeFalse` (not in the assertion typings) and don't assert on `encodeURIComponent` output for `!`, `'`, `(`, `)`, `*` (jsdom/Vitest keep them literal).
- ionicons v8 has no `whatsapp-outline`; use `logoWhatsapp` (icon name `logo-whatsapp`).
- Prod build budgets: initial bundle max 5MB (error), anyComponentStyle max 8kb (error) — watch SCSS size in pages.
- Angular CLI analytics disabled in angular.json.
