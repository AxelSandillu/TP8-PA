import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordImpression } from '@/lib/db'
import {
  COOKIE,
  SESSION_WINDOW,
  THIRTY_DAYS,
  assignVariant,
  cookieOptions,
  isVariant,
  isValidVisitorId,
} from '@/lib/experiment'

const CRAWLER_PATTERN =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|telegrambot|embedly|quora link preview|pinterest|vkshare|w3c_validator|google-inspectiontool|gptbot|chatgpt-user|claudebot|ccbot|perplexitybot/i

function isCrawler(userAgent: string): boolean {
  return CRAWLER_PATTERN.test(userAgent)
}

function isSecureRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwarded) return forwarded === 'https'
  return request.nextUrl.protocol === 'https:'
}

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Vary', 'Cookie')
  return response
}

export function proxy(request: NextRequest) {
  const requestedPreview = request.nextUrl.searchParams.get('preview')

  if (isVariant(requestedPreview)) {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return privateResponse(response)
  }

  const userAgent = request.headers.get('user-agent') ?? ''
  const visitorCookie = request.cookies.get(COOKIE.visitor)?.value

  // Un crawler no conserva cookies. Le servimos siempre el control, en la
  // misma URL y sin escribir cookies ni contar una impresión.
  if (isCrawler(userAgent)) {
    request.cookies.delete(COOKIE.visitor)
    request.cookies.delete(COOKIE.variant)
    return privateResponse(
      NextResponse.next({ request: { headers: request.headers } }),
    )
  }

  const visitor = isValidVisitorId(visitorCookie)
    ? visitorCookie
    : crypto.randomUUID()
  const variant = assignVariant(visitor)
  const secure = isSecureRequest(request)

  request.cookies.set(COOKIE.visitor, visitor)
  request.cookies.set(COOKIE.variant, variant)

  const response = privateResponse(
    NextResponse.next({ request: { headers: request.headers } }),
  )
  response.cookies.set(COOKIE.visitor, visitor, cookieOptions(secure, THIRTY_DAYS))
  response.cookies.set(COOKIE.variant, variant, cookieOptions(secure, THIRTY_DAYS))

  const lastImpression = Number(request.cookies.get(COOKIE.impressed)?.value)
  const now = Date.now()
  const hasActiveSession =
    Number.isFinite(lastImpression) &&
    lastImpression > 0 &&
    lastImpression <= now &&
    now - lastImpression < SESSION_WINDOW * 1000

  if (request.method === 'GET' && !hasActiveSession) {
    try {
      recordImpression(visitor, variant)
    } catch (error) {
      console.error('No se pudo registrar la impresión', error)
    }

    const timestamp = String(now)
    request.cookies.set(COOKIE.impressed, timestamp)
    response.cookies.set(COOKIE.impressed, timestamp, cookieOptions(secure, SESSION_WINDOW))
  }

  return response
}

export const config = {
  matcher: ['/practica'],
}
