import { defineMiddlewares } from "@medusajs/framework/http"

import { posterPrintFilesMiddlewares } from "./admin/orders/[id]/poster-print-files/middlewares"
import { posterPhotoMiddlewares } from "./store/poster-photos/middlewares"

export default defineMiddlewares({
  routes: [...posterPrintFilesMiddlewares, ...posterPhotoMiddlewares],
})
