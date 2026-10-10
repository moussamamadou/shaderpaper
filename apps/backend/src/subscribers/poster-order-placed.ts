import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { renderPosterPrintFilesWorkflow } from "../workflows/render-poster-print-files"

/**
 * Renders the print files of the shader posters in a new order. It does not send anything to Prodigi:
 * an admin does that, once the files are checked (POST /admin/orders/:id/prodigi).
 */
export default async function posterOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const { result } = await renderPosterPrintFilesWorkflow(container).run({
      input: { order_id: data.id },
    })
    if (result.rendered.length || result.failed.length) {
      logger.info(
        `Poster print files for order ${data.id}: ${result.rendered.length} rendered, ${result.failed.length} failed`
      )
    }
  } catch (error) {
    logger.error(
      `Poster print files for order ${data.id} failed: ${error instanceof Error ? error.message : error}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
