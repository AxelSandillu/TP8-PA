'use client'

import { useState, useTransition } from 'react'
import { recordConversion } from '@/app/practica/actions'
import type { ConversionStatus } from '@/lib/experiment'

const MESSAGES: Record<ConversionStatus, string> = {
  recorded: 'Conversión anotada. Queda una sola por visitante.',
  duplicate: 'Este visitante ya tenía una conversión anotada. El segundo clic no suma.',
  ignored: 'No se pudo anotar: falta la asignación del visitante.',
  preview: 'Vista previa: el clic no escribe cookies ni suma una conversión.',
}

export function Cta({ label, preview = false }: { label: string; preview?: boolean }) {
  const [status, setStatus] = useState<ConversionStatus | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await recordConversion({ from: 'cta', preview })
            setStatus(result.status)
          })
        }}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {label}
      </button>
      <p className="max-w-md text-sm text-muted-foreground">
        {status
          ? MESSAGES[status]
          : 'La conversión se anota solo acá. Cargar la página no cuenta.'}
      </p>
    </div>
  )
}
