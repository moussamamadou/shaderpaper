import type { IFileModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { PosterPrintFailure, PosterPrintFile, PosterPrintJob } from "../../poster/print-files"
import { printRendererConfig, renderPrintImage } from "../../poster/print-renderer"

export type RenderPosterPrintFilesOutput = {
  rendered: { item_id: string; print_file: PosterPrintFile }[]
  failed: PosterPrintFailure[]
}

/**
 * Renders each poster line with the print renderer and stores the image as a private file. A render
 * that fails is reported, not thrown, so the others keep their files; compensation deletes the files
 * created here.
 */
export const renderPosterPrintFilesStep = createStep(
  "render-poster-print-files",
  async (job: PosterPrintJob, { container }) => {
    const output: RenderPosterPrintFilesOutput = { rendered: [], failed: [...job.skipped] }
    if (!job.items.length) return new StepResponse(output, [] as string[])

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const config = printRendererConfig()
    if (!config) {
      const message = "The print renderer isn't configured (PRINT_RENDERER_URL)"
      logger.warn(`Order ${job.display_id}: ${message}`)
      output.failed.push(...job.items.map((item) => ({ item_id: item.item_id, message })))
      return new StepResponse(output, [] as string[])
    }

    const fileModule = container.resolve<IFileModuleService>(Modules.FILE)
    for (const item of job.items) {
      try {
        const { image, width, height } = await renderPrintImage(config, item)
        const file = await fileModule.createFiles({
          filename: `posters/order-${job.display_id}/${item.item_id}-${item.size.id}.png`,
          mimeType: "image/png",
          content: image.toString("base64"),
          access: "private",
        })
        output.rendered.push({
          item_id: item.item_id,
          print_file: {
            file_id: file.id,
            width,
            height,
            size: item.size.id,
            format: "png",
            rendered_at: new Date().toISOString(),
          },
        })
        logger.info(`Order ${job.display_id}: print file for ${item.item_id} (${width}×${height})`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`Order ${job.display_id}: no print file for ${item.item_id}: ${message}`)
        output.failed.push({ item_id: item.item_id, message })
      }
    }

    return new StepResponse(
      output,
      output.rendered.map((r) => r.print_file.file_id)
    )
  },
  async (fileIds, { container }) => {
    if (!fileIds?.length) return
    await container.resolve<IFileModuleService>(Modules.FILE).deleteFiles(fileIds)
  }
)
