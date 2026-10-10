import { defineMiddlewares } from "@medusajs/framework/http"

import { posterPrintFilesMiddlewares } from "./admin/orders/[id]/poster-print-files/middlewares"
import { prodigiOrderMiddlewares } from "./admin/orders/[id]/prodigi/middlewares"

export default defineMiddlewares({
  routes: [...posterPrintFilesMiddlewares, ...prodigiOrderMiddlewares],
})
