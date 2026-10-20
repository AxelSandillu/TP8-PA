import type { Metadata } from 'next'
import Link from 'next/link'
import { readLog } from '@/lib/db'
import {
  HASH_EXAMPLE_ID,
  TEST_CASE,
  VARIANTS,
  assignVariant,
  conversionRate,
  formatCount,
  formatPoints,
  formatRate,
  rateGap,
  type ExperimentLog,
  type Variant,
} from '@/lib/experiment'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bitácora',
  robots: { index: false, follow: false },
}

const ROWS: Variant[] = ['a', 'b']

function loadLog(): { log: ExperimentLog | null } {
  try {
    return { log: readLog() }
  } catch (error) {
    console.error('No se pudo leer el log de eventos', error)
    return { log: null }
  }
}

function StatsTable({ log, caption }: { log: ExperimentLog; caption: string }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="mb-3 text-left text-muted-foreground">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          <th className="py-2 font-medium">Variante</th>
          <th className="py-2 font-medium">Impresiones</th>
          <th className="py-2 font-medium">Conversiones</th>
          <th className="py-2 font-medium">Tasa</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((variant) => (
          <tr key={variant} className="border-b border-border">
            <td className="py-3">
              {variant.toUpperCase()} · {VARIANTS[variant].name}
            </td>
            <td className="py-3 font-mono">{formatCount(log[variant].impressions)}</td>
            <td className="py-3 font-mono">{formatCount(log[variant].conversions)}</td>
            <td className="py-3 font-mono">{formatRate(conversionRate(log[variant]))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function BitacoraPage() {
  const { log } = loadLog()
  const demoVariant = assignVariant(HASH_EXAMPLE_ID)
  const realGap = log ? rateGap(log) : null

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Log persistido en SQLite · sin declarar ganador
      </p>
      <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-balance md:text-5xl">
        La tasa sale de dividir conversiones por impresiones.
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Sin impresiones no hay tasa: se muestra Pendiente, no 0%. Una diferencia más alta no es una
        prueba. El caso fijo se calcula con la misma fórmula, aunque nadie haya entrado.
      </p>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Eventos del experimento</h2>
        {log ? (
          <>
            <StatsTable
              log={log}
              caption="Datos leídos de la base. Las impresiones se cuentan por sesión de 30 minutos y las conversiones, una por visitante."
            />
            <p className="font-mono text-sm">B − A = {formatPoints(realGap)}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No se pudo leer la base de eventos. El caso fijo de abajo sigue disponible.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Caso de prueba fijo</h2>
        <StatsTable
          log={TEST_CASE}
          caption="Cohorte fija: A 240/18, B 236/31. No sale de la sesión y tiene que dar 7,50%, 13,14% y 5,64 pp."
        />
        <p className="font-mono text-sm">B − A = {formatPoints(rateGap(TEST_CASE))}</p>
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <h2 className="font-serif text-2xl">Prueba del hash estable</h2>
        <p className="font-mono text-sm">
          assignVariant(&apos;{HASH_EXAMPLE_ID}&apos;) → {demoVariant.toUpperCase()}
        </p>
        <p className="text-sm text-muted-foreground">
          FNV-1a de 32 bits sobre los bytes UTF-8. Repetir el mismo identificador devuelve siempre la
          misma variante.
        </p>
      </section>

      <Link href="/practica" className="text-sm text-muted-foreground underline">
        Volver a la landing
      </Link>
    </main>
  )
}
