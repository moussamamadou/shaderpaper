import { FetchError } from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { getCacheTag, revalidateTag, withCache } from "../cache"
import {
  getAuthToken,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
} from "../cookies"
import { medusaError } from "../medusa-error"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/customer.ts */

export type CustomerAuthState =
  | { state: "error"; error: string }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

// Requests a verification email for the given customer. The request must be
// authenticated with a token tied to the auth identity.
async function requestVerificationEmail(email: string, token: string) {
  const sdk = useMedusa()

  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
    },
    {
      authorization: `Bearer ${token}`,
    }
  )
}

/**
 * Returns the logged-in customer or null. Unlike Next (dead `!authHeaders`
 * guard), this short-circuits properly when there is no JWT — same observable
 * result as the 401 -> null path, without the wasted request.
 */
export async function retrieveCustomer(
  event: H3Event
): Promise<HttpTypes.StoreCustomer | null> {
  if (!getAuthToken(event)) {
    return null
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(event, "customers", "/store/customers/me", () =>
    sdk.client.fetch<{ customer: HttpTypes.StoreCustomer }>(
      `/store/customers/me`,
      {
        method: "GET",
        query: { fields: "*orders" },
        headers,
      }
    )
  )
    .then(({ customer }) => customer)
    .catch(() => null)
}

export async function updateCustomer(
  event: H3Event,
  body: HttpTypes.StoreUpdateCustomer
): Promise<HttpTypes.StoreCustomer> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  revalidateTag(getCacheTag(event, "customers"))

  return updateRes
}

export type SignupInput = {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
}

export async function signup(
  event: H3Event,
  input: SignupInput
): Promise<CustomerAuthState> {
  const sdk = useMedusa()
  const { password, ...customerForm } = input

  try {
    await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password,
    })
  } catch (error) {
    const fetchError = error as FetchError
    // An existing identity (e.g. an admin user with the same email) is
    // expected and handled: the customer can still log in to link a customer
    // record. Any other error is surfaced.
    if (
      fetchError.statusText !== "Unauthorized" ||
      fetchError.message !== "Identity with email already exists"
    ) {
      return { state: "error", error: String(error) }
    }
  }

  // Persist the extra signup fields; the customer record is created during
  // login (deferred past email verification when the backend requires it).
  setPendingCustomer(event, customerForm)

  return completeLogin(event, customerForm.email, password)
}

export async function login(
  event: H3Event,
  input: { email: string; password: string }
): Promise<CustomerAuthState> {
  return completeLogin(event, input.email, input.password)
}

// Logs the customer in and reconciles the customer record. Driven entirely by
// the backend's login response, so it works with or without email
// verification.
async function completeLogin(
  event: H3Event,
  email: string,
  password: string
): Promise<CustomerAuthState> {
  const sdk = useMedusa()

  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "emailpass", { email, password })
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  // A `location` is returned by third-party auth providers (unsupported).
  if (typeof result === "object" && "location" in result) {
    return {
      state: "error",
      error: "This login method isn't supported by the storefront.",
    }
  }

  // The backend requires email verification and the customer hasn't verified
  // yet. Send the verification email and ask them to check their inbox.
  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    try {
      await requestVerificationEmail(email, result.token)
    } catch {
      // Ignore: the customer can resend from the verification page.
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return {
      state: "error",
      error: "Authentication requires additional steps that aren't supported.",
    }
  }

  let token = result

  // The token may not be tied to a customer record yet — probe
  // /store/customers/me; a failure means we still need to create the
  // customer, then log in again for a customer-bound token.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const pending = getPendingCustomer(event)

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: pending?.first_name,
          last_name: pending?.last_name,
          phone: pending?.phone,
        },
        {},
        { authorization: `Bearer ${token}` }
      )

      token = (await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })) as string
    } catch (error) {
      return { state: "error", error: String(error) }
    }

    removePendingCustomer(event)
  }

  setAuthToken(event, token)

  revalidateTag(getCacheTag(event, "customers"))

  // Drop any orders cached under this cache id: on a shared browser the
  // previous customer's list must not survive an account switch.
  revalidateTag(getCacheTag(event, "orders"))

  try {
    await transferCart(event)
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  return { state: "success" }
}

/**
 * Confirms a customer's email using the token from the verification link.
 * Unauthenticated — works cross-device.
 */
export async function confirmEmailVerification(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const sdk = useMedusa()

  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Logs the customer out: clears JWT + cart cookies, busts customer/cart
 * caches and returns the redirect path.
 */
export async function signout(
  event: H3Event,
  countryCode: string
): Promise<{ redirect: string }> {
  const sdk = useMedusa()

  await sdk.auth.logout()

  removeAuthToken(event)

  revalidateTag(getCacheTag(event, "customers"))

  // _medusa_cache_id survives logout, so the signed-out visitor would keep
  // hitting entries written while authenticated unless they are dropped here.
  revalidateTag(getCacheTag(event, "orders"))

  removeCartId(event)

  revalidateTag(getCacheTag(event, "carts"))

  return { redirect: `/${countryCode}/account` }
}

/** Claims the guest cart for the logged-in customer. Errors propagate. */
export async function transferCart(event: H3Event): Promise<void> {
  const cartId = getCartId(event)

  if (!cartId) {
    return
  }

  const sdk = useMedusa()
  const headers = getAuthHeaders(event)

  await sdk.store.cart.transferCart(cartId, {}, headers)

  revalidateTag(getCacheTag(event, "carts"))
}

export type AddressInput = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  postal_code: string
  province?: string
  country_code: string
  phone?: string
  is_default_billing?: boolean
  is_default_shipping?: boolean
}

export type AddressResult = { success: boolean; error: string | null }

export async function addCustomerAddress(
  event: H3Event,
  input: AddressInput
): Promise<AddressResult> {
  const address = {
    first_name: input.first_name,
    last_name: input.last_name,
    company: input.company,
    address_1: input.address_1,
    address_2: input.address_2,
    city: input.city,
    postal_code: input.postal_code,
    province: input.province,
    country_code: input.country_code,
    phone: input.phone,
    is_default_billing: input.is_default_billing || false,
    is_default_shipping: input.is_default_shipping || false,
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "customers"))
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

/** Errors are swallowed (Next parity) — resolves void either way. */
export async function deleteCustomerAddress(
  event: H3Event,
  addressId: string
): Promise<void> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "customers"))
    })
    .catch(() => {
      // swallowed, mirrors Next behavior
    })
}

export async function updateCustomerAddress(
  event: H3Event,
  addressId: string | undefined,
  input: Omit<AddressInput, "is_default_billing" | "is_default_shipping">
): Promise<AddressResult> {
  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address: HttpTypes.StoreUpdateCustomerAddress = {
    first_name: input.first_name,
    last_name: input.last_name,
    company: input.company,
    address_1: input.address_1,
    address_2: input.address_2,
    city: input.city,
    postal_code: input.postal_code,
    province: input.province,
    country_code: input.country_code,
  }

  if (input.phone) {
    address.phone = input.phone
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(() => {
      revalidateTag(getCacheTag(event, "customers"))
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
