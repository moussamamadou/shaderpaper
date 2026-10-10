import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { sdk } from "../lib/client"

type PosterLine = {
  item_id: string
  /** A set's poster: the sky's (moment), the photo's (nous) or the map's (lieu). */
  part: "moment" | "nous" | "lieu" | null
  title: string | null
  variant_title: string | null
  quantity: number
  thumbnail: string | null
  print_file: { url: string | null; width: number; height: number; rendered_at: string } | null
  print_error: { message: string; at: string } | null
}

type RenderResult = { rendered: unknown[]; failed: { item_id: string; message: string }[] }

/** What a set's poster is called in its row. */
const PARTS = { moment: "star map", nous: "photo", lieu: "city map" }

/** Print files of the order's custom posters (each poster of a set): download, or render them (again). */
const PosterPrintFilesWidget = ({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const queryClient = useQueryClient()
  const queryKey = ["poster-print-files", order.id]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => sdk.client.fetch<{ posters: PosterLine[] }>(`/admin/orders/${order.id}/poster-print-files`),
  })

  const render = useMutation({
    mutationFn: (force: boolean) =>
      sdk.client.fetch<RenderResult>(`/admin/orders/${order.id}/poster-print-files`, {
        method: "POST",
        body: { force },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey })
      if (result.failed.length) toast.error(`${result.failed.length} print file(s) failed: ${result.failed[0].message}`)
      else toast.success(`${result.rendered.length} print file(s) rendered`)
    },
    onError: (error) => toast.error(error.message || "Rendering failed"),
  })

  const posters = data?.posters ?? []
  // Orders without a custom poster don't show the widget.
  if (!isLoading && !posters.length) return null

  const missing = posters.some((poster) => !poster.print_file)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Poster print files</Heading>
        <Button
          size="small"
          variant="secondary"
          isLoading={render.isPending}
          disabled={render.isPending || isLoading}
          onClick={() => render.mutate(!missing)}
        >
          {missing ? "Render" : "Render again"}
        </Button>
      </div>
      {isLoading ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Loading…
          </Text>
        </div>
      ) : (
        posters.map((poster) => (
          <div key={`${poster.item_id}-${poster.part ?? ""}`} className="flex items-center gap-3 px-6 py-4">
            {poster.thumbnail ? (
              <img
                src={poster.thumbnail}
                alt=""
                className="h-12 w-auto shrink-0 rounded-sm shadow-elevation-card-rest"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-y-1">
              <Text size="small" leading="compact" weight="plus" className="truncate">
                {poster.title ?? "Custom map poster"}
                {poster.part ? ` (${PARTS[poster.part]})` : ""} · {poster.quantity}×
              </Text>
              <Text size="small" leading="compact" className="truncate text-ui-fg-subtle">
                {poster.variant_title}
                {poster.print_file ? ` · ${poster.print_file.width} × ${poster.print_file.height} px` : ""}
              </Text>
              {poster.print_error && !poster.print_file ? (
                <Text size="small" leading="compact" className="text-ui-fg-error">
                  {poster.print_error.message}
                </Text>
              ) : null}
            </div>
            {poster.print_file?.url ? (
              <Button size="small" variant="transparent" asChild>
                <a href={poster.print_file.url} target="_blank" rel="noreferrer" download>
                  Download
                </a>
              </Button>
            ) : (
              <Badge size="2xsmall" color={poster.print_error ? "red" : "grey"}>
                {poster.print_error ? "Failed" : "Pending"}
              </Badge>
            )}
          </div>
        ))
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side",
})

export default PosterPrintFilesWidget
