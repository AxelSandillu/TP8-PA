# Laboratorio 01 · Taller Norte A/B

Landing con dos mensajes, una sola URL indexable. La variante se asigna en el servidor con un hash estable del visitante, viaja en una cookie httpOnly y nunca se escribe en el canonical. Las impresiones y conversiones se guardan en SQLite, del lado del servidor.

## Stack

- Next.js 16.4 (App Router, Proxy en runtime Node.js)
- React 19
- TypeScript
- Tailwind CSS 4
- SQLite mediante `node:sqlite` (incluido en Node.js, sin dependencias extra)

## Cómo correr

Requiere Node.js 22.5 o superior (probado con Node 26).

```bash
pnpm install
pnpm dev
```

Abrir:

- Landing: http://localhost:3000/practica
- Bitácora: http://localhost:3000/bitacora
- Preview A: http://localhost:3000/practica?preview=a
- Preview B: http://localhost:3000/practica?preview=b

También funciona con `npm install` / `npm run dev`.

Build de producción:

```bash
pnpm build
pnpm start
```

## Cómo funciona

### 1. Asignación estable

En el primer request sin cookie, `proxy.ts`:

1. Genera un visitante con `crypto.randomUUID()`.
2. Deriva la variante con `assignVariant(visitorId)`.
3. Persiste `lab_visitor`, `lab_variant` y `lab_impressed` en cookies httpOnly con `Path=/`.
4. Las cookies de visitante y variante duran 30 días.

`assignVariant` usa **FNV-1a de 32 bits sobre los bytes UTF-8** del identificador. La paridad del hash decide la variante (`hash % 2 === 0` → A, si no → B). Es determinístico: el mismo id devuelve siempre la misma variante. No se usa `Math.random()`, ni `localStorage`, ni la URL para asignar.

Prueba estable pedida por la cátedra:

```text
assignVariant('lab-visitor-demo-01') → B
```

La variante se recalcula desde el visitante en cada request. La cookie `lab_variant` se publica, pero no se confía ciegamente en ella: si alguien la edita, el hash del visitante manda.

### 2. Preview

`?preview=a` y `?preview=b` son instrumentos de inspección:

- Muestran el copy pedido en el query.
- No escriben cookies.
- No cuentan impresión.
- Llevan `noindex, nofollow` en el HTML y `X-Robots-Tag` en la respuesta.
- El canonical sigue siendo `/practica`.

Al salir del preview vuelve la variante asignada por cookie.

### 3. Metadatos en el servidor

`generateMetadata` lee la cookie del visitante y publica en el HTML del primer response:

- `title` y `description` de la variante asignada, con `title.absolute` para que el layout no agregue el sufijo `· Laboratorio 01`.
- `canonical` fijo en `/practica`, sin query.
- `robots: index, follow` en la landing normal y `noindex, nofollow` en el preview.

Los metadatos no se escriben con JavaScript en el cliente.

### 4. Crawlers

Los user agents de buscadores y rastreadores reciben siempre el **control A**, en la misma URL y con el mismo canonical. No se les escribe cookie ni se les cuenta una impresión. Un crawler suele no conservar cookies; si cada visita sin cookie sorteara el mensaje, el buscador podría indexar un texto inestable.

Esto no es cloaking: no se le muestra al buscador un contenido distinto para manipular el ranking. Se le sirve la variante de control como default estable, con el mismo canonical que ve la persona.

### 5. Impresiones

Una impresión por sesión de 30 minutos:

- La cookie `lab_impressed` guarda el timestamp de la última impresión.
- Si se recarga dentro de los 30 minutos, no se suma otra.
- Pasada la ventana, el siguiente GET suma una impresión nueva.
- Solo se cuentan requests `GET` a `/practica`; las server actions no generan impresiones.
- El preview y los crawlers no cuentan.

### 6. Conversiones

Una conversión por visitante, disparada solo por el CTA:

- La server action `recordConversion` exige `from: 'cta'`.
- Cargar la página no llama a la acción.
- Un segundo clic devuelve `duplicate`.
- Hay doble protección: cookie `lab_converted` y un índice único parcial en SQLite (`visitor` único cuando `type = 'conversion'`).
- Las conversiones desde `?preview=` devuelven `preview` y no se guardan.

### 7. Base de datos

El log vive en SQLite, del lado del servidor, no en el navegador:

- Archivo por defecto: `.data/experiment.db` (ignorado por git).
- Se puede cambiar con `EXPERIMENT_DB_PATH`.
- Tabla `events`: `type`, `variant`, `visitor`, `created_at`.
- Índice único para una conversión por visitante.
- `readLog()` valida los conteos leídos antes de mostrarlos.

Para reiniciar el experimento local:

```bash
rm -rf .data
```

Para inspeccionar los eventos:

```bash
sqlite3 .data/experiment.db "SELECT type, variant, COUNT(*) FROM events GROUP BY type, variant;"
```

### 8. Bitácora

`/bitacora` muestra:

- Impresiones, conversiones y tasa reales por variante, leídas de SQLite.
- La diferencia B − A en puntos porcentuales.
- El caso de prueba fijo, calculado con la misma fórmula (no con porcentajes escritos a mano).
- La prueba del hash con `lab-visitor-demo-01`.

Si no hay impresiones, la tasa es `Pendiente`, no `0%`. No se declara ganador.

## Caso de prueba

| Variante | Impresiones | Conversiones | Tasa |
| :--- | ---: | ---: | ---: |
| A. Control | 240 | 18 | 7,50% |
| B. Tratamiento | 236 | 31 | 13,14% |
| B − A | — | — | 5,64 pp |

Cálculo:

```text
18 / 240 = 0,075      = 7,50%
31 / 236 = 0,1313559  = 13,14%
13,14% − 7,50%        = 5,64 pp
```

La diferencia no demuestra que B sea mejor: es una diferencia, no una prueba de significancia.

## Archivos

| Archivo | Responsabilidad |
| :--- | :--- |
| `proxy.ts` | Asigna visitante y variante, persiste cookies, separa preview y registra una impresión por sesión. |
| `lib/experiment.ts` | Copy, oferta, caso fijo, hash FNV-1a, tasa, validación del log y opciones de cookie. |
| `lib/db.ts` | Conexión SQLite, esquema, alta de eventos y lectura agregada del log. |
| `app/practica/page.tsx` | Landing, resolución de variante, title/description, canonical y noindex. |
| `app/practica/actions.ts` | Conversión server-side, una por visitante, solo desde el CTA. |
| `app/bitacora/page.tsx` | Tablas de eventos reales y del caso fijo, tasas y prueba del hash. |
| `components/landing.tsx` | Mensaje y oferta (la oferta es igual en A y B). |
| `components/cta.tsx` | Botón que dispara la conversión y muestra el resultado. |

## Verificación manual

1. Abrir `/practica` y anotar la variante.
2. Recargar: la variante no cambia.
3. Borrar cookies y volver: puede tocar la otra variante (es otro visitante).
4. Abrir `/practica?preview=b`: se ve B, con `noindex`, sin `Set-Cookie`.
5. Volver a `/practica`: vuelve la variante asignada.
6. Ver el código fuente de la página (no solo la pantalla): el `title` y la `description` son los de la variante; el canonical es `/practica`.
7. Recargar dentro de 30 minutos: la tabla de `/bitacora` no suma otra impresión.
8. Cargar la página y mirar la bitácora: no suma conversión.
9. Hacer clic en el CTA: suma una conversión. Un segundo clic no suma otra.
10. Abrir `/bitacora` sin sesión: el caso fijo sigue dando 7,50%, 13,14% y 5,64 pp.
11. Buscar `localStorage` en el proyecto: no se usa para asignar ni para contar.
12. Pedir `/practica` con user agent de Googlebot: recibe el control A, sin cookies y sin impresión.

## Notas de deploy

SQLite es ideal para la corrección local del TP. En un entorno serverless (por ejemplo Vercel) el sistema de archivos no es persistente entre instancias o despliegues, así que para producción habría que reemplazar `lib/db.ts` por una base administrada (Postgres, Turso, etc.) manteniendo la misma interfaz `recordImpression` / `recordConversion` / `readLog`.

No hay secretos en el repositorio. Las variables de entorno locales van en `.env` y están ignoradas por git.

## Informe

El informe de una carilla está en [`INFORME.md`](./INFORME.md).
