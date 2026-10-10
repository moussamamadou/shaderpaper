import { defineEventHandler } from "h3"
import { retrieveCustomer } from "../../utils/data/customer"

/** retrieveCustomer — the logged-in customer (fields=*orders) or null. */
export default defineEventHandler(async (event) => {
  return retrieveCustomer(event)
})
