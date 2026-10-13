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
  - `tab3` — Registrar (add member): reactive form (`NonNullableFormBuilder`) with four **floating-label** fields (nombre, WhatsApp, fecha de ingreso, cuota), quick-amount chips, a live summary (alumno / cuota / ingreso / primer vencimiento) and a sticky action bar. Each field gives state feedback: gold label + ring while focused, red label + ring + message when `ion-touched.ion-invalid`, and a **green tick in the end slot when valid and blurred** — while typing, that same slot shows a clear (✕) button instead (`limpiarNombre` / `limpiarTelefono`). First due date is derived (ingreso + 30 días) and never typed by hand.
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
- **Dark-only institutional theme: black + gold, premium look.** No light mode; `index.html` sets `<html class="ion-palette-dark">` and `color-scheme: dark`.
- `src/theme/variables.scss` holds the whole design system under the `--gm-*` prefix:
  - gold (`--gm-oro-1/2/3`, `--gm-grad-oro`, `--gm-acento-*`), layered surfaces (`--gm-bg` `#08080a`, `--gm-card-bg`, `--gm-grad-card`, `--gm-glass`), hairlines (`--gm-card-border`), elevation (`--gm-sombra-1/2/3`, `--gm-sombra-oro`, `--gm-anillo-oro`), semantic tints (`--gm-tinte-*`), radii (`--gm-radio[lg|xl]`), text (`--gm-texto`/`-suave`/`-tenue`) and motion (`--gm-ease`, `--gm-trans`). Ionic palette: primary `#eab308` with black contrast.
  - `--gm-gradiente` is an alias of `--gm-grad-oro` (kept for compatibility).
- `src/global.scss` imports `@ionic/angular/css/palettes/dark.class.css` and then applies the premium layer: content background with a gold aura (`ion-content::part(background)`), glass toolbars, elevated cards, gold buttons/FAB, segment pills, glass searchbar, grouped `ion-list[inset]` surfaces, modal sheet with blurred backdrop, plus shared utilities (`.vacio`, `.sufijo-monto`, `.gm-badge`, `.gm-titulo`, `.gm-animar`).
- Per-page SCSS only adds layout and per-page accents, so component styles stay under the `anyComponentStyle` budget (tab3 is the tightest, ~4.5 kB of the 8 kB error limit).
- `app.component.ts` sets the Android status bar to `Style.Dark`.

### Theming gotchas (learned the hard way)
- **Specificity:** Ionic sets its component defaults in `:host` / `ion-x` rules injected at runtime, so a plain element selector in `global.scss` (e.g. `ion-searchbar { --border-radius: … }`) can lose. Component blocks in `global.scss` are therefore nested under `:root` (specificity `(0,1,1)`). Page styles carry Angular's `_ngcontent` attribute and win over both.
- **Sizing boxed icons:** `ion-icon` computes `box-sizing: content-box`, so `width` + `border` makes the box 2px larger. Badges use `box-shadow: inset 0 0 0 1px …` for the ring instead of a border (same look, exact size).
- **Ionic colours are classes, not attributes:** `[color]` bindings on `ion-*` become `.ion-color-<name>` classes (there is no `color` attribute left), so target `ion-icon.ion-color-success`, not `ion-icon[color=success]`. Static attributes in templates (`<ion-button color="danger">`) do stay, which is why neutral-only styling uses `:not([color]):not(.ion-color)`.
- `ion-item` paints its background in `--background` (the inner shadow node), so host `background` reads as `none`; check the shadow's `.item-native` when verifying.
- **`ion-item` has no focus class**: `item-has-focus` does not exist (it is not in `item.js`), so page rules must read the state from the control — `.campo:has(ion-input.has-focus)`. `ion-searchbar` is different: that one does expose `searchbar-has-focus`.
- **Page SCSS cannot touch what Ionic renders at runtime**: Angular scopes every compound selector with `_ngcontent`, but nodes created by Ionic (`.label-text`, `.label-text-wrapper`, `.input-clear-icon`, `.input-bottom`) never get that attribute, so a component rule targeting them compiles fine and matches nothing. Anything inside an `ion-input`/`ion-item` shadow-rendered internals has to live in `global.scss` (or use `::part()`).
- **`--highlight-color-*` also paints the writing caret** (`input { caret-color: var(--highlight-color) }`), and Ionic swaps in `--highlight-color-valid` as soon as the control is valid. Never set `--highlight-color-valid` to `transparent`: the caret disappears mid-typing. Gold (`--gm-oro-1`) is the app's value, and `--highlight-height: 0` is what keeps the underline hidden.
- **Label conventions by placement**: `labelPlacement="floating"` labels are normal text (15.5px — Ionic scales them to `scale(0.75)` when they float, so the resting size also sets the floated size); `labelPlacement="stacked"` labels are the uppercase 11px micro-labels. Both variants are styled from `global.scss` under `:root`, and turn gold on focus/value and red on `ion-touched.ion-invalid`.

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
