import { FetchError } from "@medusajs/js-sdk"
import { createError } from "h3"

/**
 * Port of storefront-nextjs src/lib/util/medusa-error.ts, adapted to h3:
 * instead of throwing a plain Error it throws an H3 error with the backend's
 * status code, so Nitro routes surface proper HTTP semantics. The message
 * transform is identical: capitalize + trailing period.
 */

function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1)
}

export function medusaError(error: unknown): never {
  // Primary path: @medusajs/js-sdk throws FetchError { status, statusText, message }
  if (error instanceof FetchError) {
    const message = error.message || error.statusText || "Unknown error"

    console.error("Medusa error:", error.status, error.statusText, message)

    throw createError({
      statusCode: error.status ?? 500,
      message: `${capitalize(message)}.`,
    })
  }

  // Axios-like shape handled by the original implementation.
  const err = error as {
    response?: { data: { message?: string } | string; status: number }
    request?: unknown
    message?: string
  }

  if (err.response) {
    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : data

    console.error("Response data:", data)
    console.error("Status code:", err.response.status)

    throw createError({
      statusCode: err.response.status ?? 500,
      message: `${capitalize(String(message))}.`,
    })
  }

  if (err.request) {
    throw createError({
      statusCode: 502,
      message: "No response received: " + String(err.request),
    })
  }

  throw createError({
    statusCode: 500,
    message: "Error setting up the request: " + String(err.message),
  })
}

export default medusaError
