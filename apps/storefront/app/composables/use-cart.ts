import type { HttpTypes } from "@medusajs/types"

export type PlaceOrderResult =
  | { type: "order"; order: HttpTypes.StoreOrder; redirect: string }
  | { type: "cart"; cart: HttpTypes.StoreCart; error?: { message: string } }

export type SetAddressesResult =
  | { success: true; redirect: string }
  | { success: false; error: string }

/**
 * Cart composable over /api/cart*. Cart state is shared app-wide via
 * useState('cart'); every mutation refreshes it.
 */
export function useCart() {
  const requestFetch = useRequestFetch()
  const cart = useState<HttpTypes.StoreCart | null>("cart", () => null)

  /** GET /api/cart — null without cookie/on error (204). Updates state. */
  const retrieveCart = async (
    fields?: string
  ): Promise<HttpTypes.StoreCart | null> => {
    const result = await requestFetch<HttpTypes.StoreCart | null>(
      "/api/cart",
      { query: fields ? { fields } : undefined }
    ).catch(() => null)
    cart.value = result ?? null
    return cart.value
  }

  /**
   * POST /api/cart — creates the cart (sets _medusa_cart_id) or syncs its
   * region to the given country. Port of Next getOrSetCart.
   */
  const getOrSetCart = async (
    countryCode: string
  ): Promise<HttpTypes.StoreCart> => {
    const result = await requestFetch<HttpTypes.StoreCart>("/api/cart", {
      method: "POST",
      body: { country_code: countryCode },
    })
    cart.value = result
    return result
  }

  /** POST /api/cart/update — StoreUpdateCart body. */
  const updateCart = async (body: HttpTypes.StoreUpdateCart) => {
    const result = await requestFetch<HttpTypes.StoreCart>(
      "/api/cart/update",
      { method: "POST", body }
    )
    cart.value = result
    return result
  }

  /** POST /api/cart/line-items — adds a line (creates cart if needed). */
  const addToCart = async (body: {
    variantId: string
    quantity: number
    countryCode: string
    /** Stored on the line item (e.g. `{ poster: … }` for a custom poster). */
    metadata?: Record<string, unknown>
  }) => {
    await requestFetch<{ success: true }>("/api/cart/line-items", {
      method: "POST",
      body: {
        variant_id: body.variantId,
        quantity: body.quantity,
        country_code: body.countryCode,
        ...(body.metadata ? { metadata: body.metadata } : {}),
      },
    })
    await retrieveCart()
  }

  /** POST /api/cart/line-items/:lineId — update quantity. */
  const updateLineItem = async (body: { lineId: string; quantity: number }) => {
    await requestFetch<{ success: true }>(
      `/api/cart/line-items/${body.lineId}`,
      { method: "POST", body: { quantity: body.quantity } }
    )
    await retrieveCart()
  }

  /** DELETE /api/cart/line-items/:lineId */
  const deleteLineItem = async (lineId: string) => {
    await requestFetch<{ success: true }>(`/api/cart/line-items/${lineId}`, {
      method: "DELETE",
    })
    await retrieveCart()
  }

  /**
   * POST /api/cart/promotions — REPLACES the promotion list (Next parity).
   * Throws with the backend message for the promo form to display.
   */
  const applyPromotions = async (codes: string[]) => {
    await requestFetch<{ success: true }>("/api/cart/promotions", {
      method: "POST",
      body: { codes },
    })
    await retrieveCart()
  }

  /**
   * POST /api/cart/addresses — port of the setAddresses form action.
   * Never throws for business failures; on success the caller navigates to
   * result.redirect ("/{cc}/checkout?step=delivery").
   */
  const setAddresses = (body: {
    shipping_address: Record<string, string>
    billing_address?: Record<string, string>
    same_as_billing?: "on" | boolean
    email: string
  }) =>
    requestFetch<SetAddressesResult>("/api/cart/addresses", {
      method: "POST",
      body,
    })

  /** POST /api/cart/shipping-method */
  const setShippingMethod = async (body: {
    cartId: string
    shippingMethodId: string
  }) => {
    await requestFetch<{ success: true }>("/api/cart/shipping-method", {
      method: "POST",
      body: {
        cart_id: body.cartId,
        shipping_method_id: body.shippingMethodId,
      },
    })
    await retrieveCart()
  }

  /** POST /api/cart/payment-session */
  const initiatePaymentSession = (
    cartArg: HttpTypes.StoreCart,
    data: HttpTypes.StoreInitializePaymentSession
  ) =>
    requestFetch<HttpTypes.StorePaymentCollectionResponse>(
      "/api/cart/payment-session",
      { method: "POST", body: { cart: cartArg, data } }
    )

  /**
   * POST /api/cart/complete — on order success the server removed the cart
   * cookie; caller navigates to result.redirect.
   */
  const placeOrder = async (cartId?: string): Promise<PlaceOrderResult> => {
    const result = await requestFetch<PlaceOrderResult>("/api/cart/complete", {
      method: "POST",
      body: { cart_id: cartId },
    })
    if (result.type === "order") {
      cart.value = null
    } else {
      cart.value = result.cart
    }
    return result
  }

  /** POST /api/cart/transfer — retry cart->customer transfer. */
  const transferCart = async () => {
    await requestFetch<{ success: true }>("/api/cart/transfer", {
      method: "POST",
    })
    await retrieveCart()
  }

  /** GET /api/cart/shipping-options — options for the current cart. */
  const listCartOptions = () =>
    requestFetch<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>(
      "/api/cart/shipping-options"
    )

  /** GET /api/shipping-options?cart_id= — null on error. */
  const listCartShippingMethods = async (cartId: string) => {
    const res = await requestFetch<HttpTypes.StoreCartShippingOption[] | null>(
      "/api/shipping-options",
      { query: { cart_id: cartId } }
    ).catch(() => null)
    return res ?? null
  }

  /** POST /api/shipping-options/:optionId/calculate — null on error. */
  const calculatePriceForShippingOption = async (
    optionId: string,
    cartId: string,
    data?: Record<string, unknown>
  ) => {
    const res = await requestFetch<HttpTypes.StoreCartShippingOption | null>(
      `/api/shipping-options/${optionId}/calculate`,
      { method: "POST", body: { cart_id: cartId, data } }
    ).catch(() => null)
    return res ?? null
  }

  /** GET /api/payment-providers?region_id= — sorted asc by id, null on error. */
  const listCartPaymentMethods = async (regionId: string) => {
    const res = await requestFetch<HttpTypes.StorePaymentProvider[] | null>(
      "/api/payment-providers",
      { query: { region_id: regionId } }
    ).catch(() => null)
    return res ?? null
  }

  /**
   * POST /api/region — port of updateRegion(countryCode, currentPath):
   * syncs the cart region then navigates to the returned redirect.
   */
  const updateRegion = async (countryCode: string, currentPath: string) => {
    const res = await requestFetch<{ redirect: string }>("/api/region", {
      method: "POST",
      body: { country_code: countryCode, current_path: currentPath },
    })
    await retrieveCart()
    await navigateTo(res.redirect)
  }

  /** SSR-cached cart, shared under key 'cart-data'. */
  const useCartData = () =>
    useAsyncData("cart-data", () => retrieveCart(), { default: () => null })

  return {
    cart,
    retrieveCart,
    getOrSetCart,
    updateCart,
    addToCart,
    updateLineItem,
    deleteLineItem,
    applyPromotions,
    setAddresses,
    setShippingMethod,
    initiatePaymentSession,
    placeOrder,
    transferCart,
    listCartOptions,
    listCartShippingMethods,
    calculatePriceForShippingOption,
    listCartPaymentMethods,
    updateRegion,
    useCartData,
  }
}
