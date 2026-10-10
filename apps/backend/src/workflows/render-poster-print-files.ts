import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteFilesStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { posterPrintJob, supersededPrintFiles } from "../poster/print-files"
import { recordPosterPrintFilesStep } from "./steps/record-poster-print-files"
import { renderPosterPrintFilesStep } from "./steps/render-poster-print-files"

type Input = {
  order_id: string
  /** Render lines that already have a print file again. */
  force?: boolean
}

/**
 * Renders the print files of an order's shader posters (see src/poster/print-files.ts). Runs when an
 * order is placed, and from the admin. Nothing is sent to Prodigi here (see src/poster/prodigi.ts).
 */
export const renderPosterPrintFilesWorkflow = createWorkflow(
  "render-poster-print-files",
  function (input: Input) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "display_id", "items.id", "items.metadata", "items.variant_sku", "items.variant.metadata"],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    })

    const job = transform({ orders, input }, ({ orders, input }) =>
      posterPrintJob(orders[0], input.force)
    )
    const result = renderPosterPrintFilesStep(job)

    const record = transform({ orders, result }, ({ orders, result }) => ({
      ...result,
      items: (orders[0].items ?? []).flatMap((item) =>
        item ? [{ id: item.id, metadata: item.metadata }] : []
      ),
    }))
    recordPosterPrintFilesStep(record)

    // Last, as it can't be undone: files replaced by a forced re-render.
    const superseded = transform({ record }, ({ record }) =>
      supersededPrintFiles(record.items, record.rendered)
    )
    deleteFilesStep(superseded)

    return new WorkflowResponse(result)
  }
)
