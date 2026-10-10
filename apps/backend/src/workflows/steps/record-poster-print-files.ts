import type { IOrderModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { withPrintOutcome, type PrintOutcome } from "../../poster/print-files"
import type { RenderPosterPrintFilesOutput } from "./render-poster-print-files"

type Input = RenderPosterPrintFilesOutput & {
  /** The order's line items as queried, for their current metadata. */
  items: { id: string; metadata?: Record<string, unknown> | null }[]
}

type Previous = { id: string; metadata: Record<string, unknown> | null }[]

/**
 * Records the outcomes on their order line items: `metadata.poster.print_file`, or
 * `metadata.poster.print_error`. Compensation restores the previous metadata.
 */
export const recordPosterPrintFilesStep = createStep(
  "record-poster-print-files",
  async (input: Input, { container }) => {
    const orderModule = container.resolve<IOrderModuleService>(Modules.ORDER)
    const at = new Date().toISOString()
    const outcomes = new Map<string, PrintOutcome>()
    for (const r of input.rendered) outcomes.set(r.item_id, { print_file: r.print_file })
    for (const f of input.failed) outcomes.set(f.item_id, { error: f.message, at })

    const previous: Previous = []
    for (const [id, outcome] of outcomes) {
      const metadata = input.items.find((item) => item.id === id)?.metadata ?? null
      await orderModule.updateOrderLineItems(id, { metadata: withPrintOutcome(metadata, outcome) })
      previous.push({ id, metadata })
    }
    return new StepResponse(input.rendered.length + input.failed.length, previous)
  },
  async (previous, { container }) => {
    if (!previous?.length) return
    const orderModule = container.resolve<IOrderModuleService>(Modules.ORDER)
    for (const { id, metadata } of previous) {
      await orderModule.updateOrderLineItems(id, { metadata })
    }
  }
)
