/**
 * The cart drawer: opened by the header's cart button and after every
 * add-to-cart. `announce` is the text its aria-live region reads out; `added`
 * is the title of the poster just added (shown as a success note at the top).
 */
export function useCartDrawer() {
  const isOpen = useState('cart-drawer-open', () => false)
  const announce = useState('cart-drawer-announce', () => '')
  const added = useState('cart-drawer-added', () => '')
  const open = (opts: { message?: string; added?: string } = {}) => {
    added.value = opts.added ?? ''
    announce.value = ''
    isOpen.value = true
    // A live region only reads changes made after it is in the page: set the text once the drawer has opened.
    if (opts.message && import.meta.client) setTimeout(() => (announce.value = opts.message!), 350)
  }
  const close = () => {
    isOpen.value = false
  }
  return { isOpen, announce, added, open, close }
}
