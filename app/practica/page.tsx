import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Landing } from '@/components/landing'
import {
  CANONICAL_PATH,
  COOKIE,
  DESCRIPTION_RANGE,
  TITLE_RANGE,
  VARIANTS,
  characterCount,
  inRange,
  isVariant,
  resolveVariant,
  type Variant,
} from '@/lib/experiment'

export const dynamic = 'force-dynamic'

type PracticaPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>
}

type ResolvedVariant = {
  preview: Variant | null
  variant: Variant
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

async function resolvePageVariant(
  searchParams: PracticaPageProps['searchParams'],
): Promise<ResolvedVariant> {
  const params = await searchParams
  const requested = firstParam(params.preview)
  const preview = isVariant(requested) ? requested : null
  if (preview) return { preview, variant: preview }

  const cookieStore = await cookies()
  return {
    preview: null,
    variant: resolveVariant(
      cookieStore.get(COOKIE.visitor)?.value,
      cookieStore.get(COOKIE.variant)?.value,
    ),
  }
}

export async function generateMetadata({
  searchParams,
}: PracticaPageProps): Promise<Metadata> {
  const { preview, variant } = await resolvePageVariant(searchParams)
  const copy = VARIANTS[variant]

  return {
    title: { absolute: copy.seoTitle },
    description: copy.seoDescription,
    alternates: { canonical: CANONICAL_PATH },
    robots: preview
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      url: CANONICAL_PATH,
      siteName: 'Taller Norte',
      locale: 'es_AR',
      type: 'website',
    },
  }
}

export default async function PracticaPage({ searchParams }: PracticaPageProps) {
  const { preview, variant } = await resolvePageVariant(searchParams)
  const copy = VARIANTS[variant]
  const titleLength = characterCount(copy.seoTitle)
  const descriptionLength = characterCount(copy.seoDescription)

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Taller Norte · variante {variant.toUpperCase()} · {copy.name}
      </p>
      <p className="border-b border-border pb-4 text-sm text-muted-foreground">
        {preview
          ? `Estás viendo el copy ${preview.toUpperCase()} por query. Es una vista de inspección: no escribe cookies, no cuenta como visita y lleva noindex.`
          : `La variante ${variant.toUpperCase()} quedó asignada por cookie. Recargar no la cambia y la URL canónica sigue siendo /practica.`}
      </p>
      <Landing variant={variant} preview={preview !== null} />
      <div className="flex flex-wrap gap-2">
        <Link href="/practica?preview=a" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy A
        </Link>
        <Link href="/practica?preview=b" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy B
        </Link>
        <Link href="/practica" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Volver a mi variante
        </Link>
        <Link href="/bitacora" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Bitácora
        </Link>
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Metadatos publicados en el HTML</h2>
        <p className="text-sm text-muted-foreground">
          Canonical: <code className="font-mono">{CANONICAL_PATH}</code>, sin query. Vista previa: noindex,
          nofollow.
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Title de {variant.toUpperCase()}
            </dt>
            <dd>{copy.seoTitle}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {titleLength} caracteres · {inRange(titleLength, TITLE_RANGE) ? 'dentro de 50–60' : 'fuera de rango'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Description de {variant.toUpperCase()}
            </dt>
            <dd>{copy.seoDescription}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {descriptionLength} caracteres ·{' '}
              {inRange(descriptionLength, DESCRIPTION_RANGE) ? 'dentro de 140–160' : 'fuera de rango'}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
