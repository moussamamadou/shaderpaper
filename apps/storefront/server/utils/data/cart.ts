import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { createError } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { getCacheTag, revalidateTag, withCache } from "../cache"
import {
  getCartId,
  getLocale,
  removeCartId,
  setCartId,
} from "../cookies"
import { medusaError } from "../medusa-error"
import { useMedusa } from "../medusa"
import { getRegion } from "./regions"

/** Port of storefront-nextjs src/lib/data/cart.ts */

const DEFAULT_CART_FIELDS =
  "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name"

/**
 * Retrieves a cart by ID (falls back to the _medusa_cart_id cookie).
 * Returns null when there is no cart or on any error — never throws.
 */
export async function retrieveCart(
  event: H3Event,
  cartId?: string,
  fields?: string
): Promise<HttpTypes.StoreCart | null> {
  const id = cartId || getCartId(event)
  fields ??= DEFAULT_CART_FIELDS

  if (!id) {
    return null
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(event, "carts", `/store/carts/${id}?fields=${fields}`, () =>
    sdk.client.fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: { fields },
      headers,
    })
  )
    .then(({ cart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(
  event: H3Event,
  countryCode: string
): Promise<HttpTypes.StoreCart> {
  const region = await getRegion(event, countryCode)

  if (!region) {
    throw createError({
      statusCode: 400,
      message: `Region not found for country code: ${countryCode}`,
    })
  }

  const sdk = useMedusa()

  let cart = await retrieveCart(event, undefined, "id,region_id")

  const headers = { ...getAuthHeaders(event) }

  if (!cart) {
    const locale = getLocale(event)
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    setCartId(event, cart.id)

    revalidateTag(getCacheTag(event, "carts"))
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    revalidateTag(getCacheTag(event, "carts"))
  }

  return cart
}

export async function updateCart(
  event: H3Event,
  data: HttpTypes.StoreUpdateCart
): Promise<HttpTypes.StoreCart> {
  const cartId = getCartId(event)

  if (!cartId) {
    throw createError({
      statusCode: 400,
      message: "No existing cart found, please create one before updating",
    })
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(({ cart }) => {
      revalidateTag(getCacheTag(event, "carts"))
      revalidateTag(getCacheTag(event, "fulfillment"))
      return cart
    })
    .catch(medusaError)
}

export async function addToCart(
  event: H3Event,
  {
    variantId,
    quantity,
    countryCode,
    metadata,
  }: {
    variantId: string
    quantity: number
    countryCode: string
    /** Stored on the line item, e.g. a poster design (`metadata.poster`). */
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  if (!variantId) {
    throw createError({
      statusCode: 400,
      message: "Missing variant ID when adding to cart",
    })
  }

  const cart = await getOrSetCart(event, countryCode)

  if (!cart) {
    throw createError({
      statusCode: 500,
      message: "Error retrieving or creating cart",
    })
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      { variant_id: variantId, quantity, ...(metadata ? { metadata } : {}) },
      {},
      headers
    )
    .then(() => {
      revalidateTag(getCacheTag(event, "carts"))
      revalidateTag(getCacheTag(event, "fulfillment"))
    })
    .catch(medusaError)
}

export async function updateLineItem(
  event: H3Event,
  { lineId, quantity }: { lineId: string; quantity: number }
): Promise<void> {
  if (!lineId) {
    throw createError({
      statusCode: 400,
      message: "Missing lineItem ID when updating line item",
    })
  }

  const cartId = getCartId(event)

  if (!cartId) {
    throw createError({
      statusCode: 400,
      message: "Missing cart ID when updating line item",
    })
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "carts"))
      revalidateTag(getCacheTag(event, "fulfillment"))
    })
    .catch(medusaError)
}

export async function deleteLineItem(
  event: H3Event,
  lineId: string
): Promise<void> {
  if (!lineId) {
    throw createError({
      statusCode: 400,
      message: "Missing lineItem ID when deleting line item",
    })
  }

  const cartId = getCartId(event)

  if (!cartId) {
    throw createError({
      statusCode: 400,
      message: "Missing cart ID when deleting line item",
    })
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "carts"))
      revalidateTag(getCacheTag(event, "fulfillment"))
    })
    .catch(medusaError)
}

export async function setShippingMethod(
  event: H3Event,
  { cartId, shippingMethodId }: { cartId: string; shippingMethodId: string }
): Promise<void> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  await sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "carts"))
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  event: H3Event,
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
): Promise<HttpTypes.StorePaymentCollectionResponse> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then((resp) => {
      revalidateTag(getCacheTag(event, "carts"))
      return resp
    })
    .catch(medusaError)
}

/** REPLACES the promo list wholesale — removal = resubmit list without the code. */
export async function applyPromotions(
  event: H3Event,
  codes: string[]
): Promise<void> {
  const cartId = getCartId(event)

  if (!cartId) {
    throw createError({ statusCode: 400, message: "No existing cart found" })
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  await sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "carts"))
      revalidateTag(getCacheTag(event, "fulfillment"))
    })
    .catch(medusaError)
}

export type SetAddressesInput = {
  shipping_address: Record<string, string | null | undefined>
  billing_address?: Record<string, string | null | undefined>
  same_as_billing?: string | boolean
  email: string
}

export type SetAddressesResult =
  | { success: true; redirect: string }
  | { success: false; error: string }

/**
 * Port of the setAddresses server action. Accepts a JSON body using the same
 * field names as the Next form. The upstream missing-await bug on the cart-id
 * guard is fixed here (per spec instruction): the guard actually fires.
 * Instead of redirecting server-side it returns the redirect path.
 */
export async function setAddresses(
  event: H3Event,
  input: SetAddressesInput
): Promise<SetAddressesResult> {
  try {
    if (!input) {
      throw new Error("No form data found when setting addresses")
    }

    const cartId = getCartId(event)
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const shipping = input.shipping_address ?? {}

    const data: HttpTypes.StoreUpdateCart & { email: string } = {
      shipping_address: {
        first_name: shipping.first_name ?? undefined,
        last_name: shipping.last_name ?? undefined,
        address_1: shipping.address_1 ?? undefined,
        address_2: "",
        company: shipping.company ?? undefined,
        postal_code: shipping.postal_code ?? undefined,
        city: shipping.city ?? undefined,
        country_code: shipping.country_code ?? undefined,
        province: shipping.province ?? undefined,
        phone: shipping.phone ?? undefined,
      },
      email: input.email,
    }

    const sameAsBilling =
      input.same_as_billing === "on" || input.same_as_billing === true

    if (sameAsBilling) {
      data.billing_address = data.shipping_address
    } else {
      const billing = input.billing_address ?? {}
      data.billing_address = {
        first_name: billing.first_name ?? undefined,
        last_name: billing.last_name ?? undefined,
        address_1: billing.address_1 ?? undefined,
        address_2: "",
        company: billing.company ?? undefined,
        postal_code: billing.postal_code ?? undefined,
        city: billing.city ?? undefined,
        country_code: billing.country_code ?? undefined,
        province: billing.province ?? undefined,
        phone: billing.phone ?? undefined,
      }
    }

    await updateCart(event, data)

    return {
      success: true,
      redirect: `/${shipping.country_code}/checkout?step=delivery`,
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export type PlaceOrderResult =
  | { type: "order"; order: HttpTypes.StoreOrder; redirect: string }
  | {
      type: "cart"
      cart: HttpTypes.StoreCart
      error?: { message: string; name: string; type: string }
    }

/**
 * Places the order. On success the cart cookie is removed (awaited, unlike
 * Next) and the confirmation redirect path is returned instead of a
 * server-side redirect.
 */
export async function placeOrder(
  event: H3Event,
  cartId?: string
): Promise<PlaceOrderResult> {
  const id = cartId || getCartId(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "No existing cart found when placing an order",
    })
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then((res) => {
      revalidateTag(getCacheTag(event, "carts"))
      return res
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    revalidateTag(getCacheTag(event, "orders"))

    removeCartId(event)

    return {
      type: "order",
      order: cartRes.order,
      redirect: `/${countryCode}/order/${cartRes.order.id}/confirmed`,
    }
  }

  return { type: "cart", cart: cartRes.cart, error: cartRes.error }
}

/**
 * Updates the region on the current cart (if any) and returns the redirect
 * path `/${countryCode}${currentPath}`.
 */
export async function updateRegion(
  event: H3Event,
  countryCode: string,
  currentPath: string
): Promise<{ redirect: string }> {
  const cartId = getCartId(event)
  const region = await getRegion(event, countryCode)

  if (!region) {
    throw createError({
      statusCode: 400,
      message: `Region not found for country code: ${countryCode}`,
    })
  }

  if (cartId) {
    await updateCart(event, { region_id: region.id })
    revalidateTag(getCacheTag(event, "carts"))
  }

  revalidateTag(getCacheTag(event, "regions"))
  revalidateTag(getCacheTag(event, "products"))

  return { redirect: `/${countryCode}${currentPath}` }
}

export async function listCartOptions(event: H3Event): Promise<{
  shipping_options: HttpTypes.StoreCartShippingOption[]
}> {
  const cartId = getCartId(event)
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(
    event,
    "shippingOptions",
    `/store/shipping-options?cart_id=${cartId}`,
    () =>
      sdk.client.fetch<{
        shipping_options: HttpTypes.StoreCartShippingOption[]
      }>("/store/shipping-options", {
        query: { cart_id: cartId },
        headers,
      })
  )
}
