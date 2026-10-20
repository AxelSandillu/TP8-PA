# Entregables · Laboratorio 01

## 1. Proyecto funcionando

El proyecto completo está en la raíz del repositorio. Para levantarlo:

```bash
pnpm install
pnpm build
pnpm start
```

La separación pedida se mantiene:

- `proxy.ts`: asignación, cookies, preview e impresiones.
- `lib/experiment.ts`: hash, copy, oferta, tasas y validaciones.
- `lib/db.ts`: persistencia del log en SQLite.
- `app/practica/page.tsx`: landing y metadatos.
- `app/practica/actions.ts`: conversión desde el CTA.
- `app/bitacora/page.tsx`: tasas reales y caso fijo.

## 2. URL

Con el servidor de producción levantado en el puerto 3000:

- Landing: <http://localhost:3000/practica>
- Bitácora: <http://localhost:3000/bitacora>

Si el servidor no está corriendo, ejecutar `pnpm start` desde la raíz (o `pnpm dev` para desarrollo).

### URL pública temporal

Mientras esta sesión siga viva, hay un túnel de Cloudflare apuntando al servidor local:

- Landing: <https://discipline-authority-terminal-seventh.trycloudflare.com/practica>
- Bitácora: <https://discipline-authority-terminal-seventh.trycloudflare.com/bitacora>

Es un túnel sin cuenta y sin garantía de uptime: sirve para mostrar la entrega ahora, no como URL
permanente. Para una entrega con URL estable hay que desplegar en un host con disco persistente o
cambiar `lib/db.ts` por una base administrada. SQLite local no persiste en serverless (Vercel, por
ejemplo).

## 3. Informe

- `INFORME.pdf`: versión final de una carilla.
- `INFORME.md`: fuente editable.
- `informe.html`: fuente HTML usada para generar el PDF.

Responde las tres preguntas pedidas y cierra con FNV-1a y `assignVariant('lab-visitor-demo-01') = B`.

## 4. Captura del caso de prueba

- `captura-caso-prueba.png`: captura anotada, con el cálculo a mano al margen:
  - `18 / 240 = 0,075 = 7,50%`
  - `31 / 236 = 0,131355… = 13,14%`
  - `13,14% − 7,50% = 5,64 pp`
- `caso-prueba.png`: recorte limpio de la tabla.
- `bitacora-completa.png`: captura completa de `/bitacora` como evidencia.

## Base de datos

El log se guarda en `.data/experiment.db` (ignorado por git). La tabla `events` registra
`impression` y `conversion` por variante y visitante. Una conversión por visitante está garantizada
también con un índice único en SQLite, no solo con la cookie.
