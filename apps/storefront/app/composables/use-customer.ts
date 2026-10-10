import type { HttpTypes } from "@medusajs/types"

export type CustomerAuthState =
  | { state: "success" }
  | { state: "verification_required"; email: string }
  | { state: "error"; error: string }

/**
 * Customer/auth composable over /api/customer* and /api/auth/*.
 * Customer state is shared app-wide via useState('customer').
 */
export function useCustomer() {
  const requestFetch = useRequestFetch()
  const customer = useState<HttpTypes.StoreCustomer | null>(
    "customer",
    () => null
  )
  // captured here (setup) so logout can clear it from an event handler
  const cartState = useState<HttpTypes.StoreCart | null>("cart", () => null)

  /** GET /api/customer — null for guests (204). Updates shared state. */
  const retrieveCustomer =
    async (): Promise<HttpTypes.StoreCustomer | null> => {
      const result = await requestFetch<HttpTypes.StoreCustomer | null>(
        "/api/customer"
      ).catch(() => null)
      customer.value = result ?? null
      return customer.value
    }

  /** POST /api/customer — throws medusaError on failure. */
  const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
    const result = await requestFetch<HttpTypes.StoreCustomer>(
      "/api/customer",
      { method: "POST", body }
    )
    customer.value = result
    return result
  }

  /** POST /api/auth/signup — never throws for business failures. */
  const signup = (body: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }) =>
    requestFetch<CustomerAuthState>("/api/auth/signup", {
      method: "POST",
      body,
    })

  /** POST /api/auth/login — transfers guest cart on success. */
  const login = (body: { email: string; password: string }) =>
    requestFetch<CustomerAuthState>("/api/auth/login", {
      method: "POST",
      body,
    })

  /** POST /api/auth/logout — navigates to the returned redirect. */
  const logout = async (countryCode: string) => {
    const res = await requestFetch<{ redirect: string }>("/api/auth/logout", {
      method: "POST",
      body: { country_code: countryCode },
    })
    customer.value = null
    // cart cookie was removed server-side; drop shared cart state too
    cartState.value = null
    await navigateTo(res.redirect)
  }

  /** POST /api/auth/verify-email */
  const verifyEmail = (token: string) =>
    requestFetch<{ success: boolean; error?: string }>(
      "/api/auth/verify-email",
      { method: "POST", body: { token } }
    )

  /** POST /api/customer/addresses — { success, error }, never throws. */
  const addAddress = (
    body: Record<string, unknown> & {
      is_default_billing?: boolean
      is_default_shipping?: boolean
    }
  ) =>
    requestFetch<{ success: boolean; error: string | null }>(
      "/api/customer/addresses",
      { method: "POST", body }
    )

  /** POST /api/customer/addresses/:addressId — { success, error }. */
  const updateAddress = (addressId: string, body: Record<string, unknown>) =>
    requestFetch<{ success: boolean; error: string | null }>(
      `/api/customer/addresses/${addressId}`,
      { method: "POST", body }
    )

  /** DELETE /api/customer/addresses/:addressId */
  const deleteAddress = (addressId: string) =>
    requestFetch<{ success: boolean }>(
      `/api/customer/addresses/${addressId}`,
      { method: "DELETE" }
    )

  /** SSR-cached customer, shared under key 'customer-data'. */
  const useCustomerData = () =>
    useAsyncData("customer-data", () => retrieveCustomer(), {
      default: () => null,
    })

  return {
    customer,
    retrieveCustomer,
    updateCustomer,
    signup,
    login,
    logout,
    verifyEmail,
    addAddress,
    updateAddress,
    deleteAddress,
    useCustomerData,
  }
}
