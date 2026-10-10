export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  body?: string
  action?: { label: string; to: string }
}

let nextId = 1

/**
 * App-wide toasts, rendered by <LayoutToasts> in an aria-live region
 * (polite for success/info, assertive for errors). They dismiss themselves
 * after a few seconds unless hovered or focused.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const push = (toast: Omit<Toast, 'id'>) => {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { ...toast, id }]
    return id
  }

  return { toasts, push, dismiss }
}
