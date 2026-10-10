import { defineEventHandler, getRouterParam } from "h3"
import { getCollectionByHandle } from "../../../utils/data/collections"

/** getCollectionByHandle — a collection (fields=*products) or null. */
export default defineEventHandler(async (event) => {
  const handle = getRouterParam(event, "handle")

  return getCollectionByHandle(event, handle as string)
})
