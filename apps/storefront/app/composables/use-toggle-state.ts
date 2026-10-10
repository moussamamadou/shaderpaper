import { ref } from "vue"
import type { Ref } from "vue"

/**
 * Port of storefront-nextjs src/lib/hooks/use-toggle-state.tsx.
 * Returns a reactive open/close/toggle state object (used by CountrySelect &
 * side-menu hover rows).
 */
export type ToggleStateType = {
  state: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
}

export function useToggleState(initialState = false): ToggleStateType {
  const state = ref(initialState)

  const close = () => {
    state.value = false
  }

  const open = () => {
    state.value = true
  }

  const toggle = () => {
    state.value = !state.value
  }

  return { state, open, close, toggle }
}
