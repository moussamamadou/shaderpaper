import { defineEventHandler } from "h3"
import { listRegions } from "../../utils/data/regions"

/** listRegions — all store regions. Errors propagate (Next parity). */
export default defineEventHandler(async (event) => {
  return listRegions(event)
})
