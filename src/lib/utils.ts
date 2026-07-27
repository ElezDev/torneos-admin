import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export const formatLabels = {
  league: 'Liga',
  knockout: 'Eliminación',
  groups: 'Grupos',
} as const

export const statusLabels = {
  draft: 'Borrador',
  registration: 'Inscripción',
  active: 'Activo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
  scheduled: 'Programado',
  live: 'En vivo',
  postponed: 'Aplazado',
  enabled: 'Habilitado',
  suspended: 'Sancionado',
} as const

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error') {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message)
  }
  return fallback
}
