import { defineEventHandler, getRouterParam } from "h3"
import { getRegion } from "../../../utils/data/regions"

/**
 * getRegion — the region for a country iso_2 code (memoized per process,
 * Next parity). Returns null when unknown.
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, "code")

  const region = await getRegion(event, (code ?? "").toLowerCase())

  return region ?? null
})
