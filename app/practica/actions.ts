'use server'

import { cookies, headers } from 'next/headers'
import { recordConversion as storeConversion } from '@/lib/db'
import {
  COOKIE,
  THIRTY_DAYS,
  cookieOptions,
  isVariant,
  isValidVisitorId,
  resolveVariant,
  type ConversionStatus,
} from '@/lib/experiment'

type ConversionInput = {
  from?: string
  preview?: boolean
}

export async function recordConversion(
  input?: ConversionInput,
): Promise<{ status: ConversionStatus }> {
  if (input?.from !== 'cta') return { status: 'ignored' }
  if (input.preview) return { status: 'preview' }

  const cookieStore = await cookies()
  const visitor = cookieStore.get(COOKIE.visitor)?.value
  if (!isValidVisitorId(visitor)) return { status: 'ignored' }

  const variant = resolveVariant(visitor, cookieStore.get(COOKIE.variant)?.value)
  if (isVariant(cookieStore.get(COOKIE.converted)?.value)) {
    return { status: 'duplicate' }
  }

  let status: ConversionStatus
  try {
    status = storeConversion(visitor, variant)
  } catch (error) {
    console.error('No se pudo registrar la conversión', error)
    return { status: 'ignored' }
  }

  if (status === 'recorded') {
    const headerStore = await headers()
    const forwarded = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const secure = forwarded ? forwarded === 'https' : false
    cookieStore.set(COOKIE.converted, variant, cookieOptions(secure, THIRTY_DAYS))
  }

  return { status }
}
