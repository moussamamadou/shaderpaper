import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { sdk } from "../lib/client"

type PosterLine = {
  item_id: string
  title: string | null
  poster_id: string | null
  variant_title: string | null
  quantity: number
  thumbnail: string | null
  print_file: { url: string | null; width: number; height: number; rendered_at: string } | null
  print_error: { message: string; at: string } | null
}

type ProdigiRecord = { env: string; order_id: string; outcome: string; stage: string | null; submitted_at: string }

type PrintFiles = {
  posters: PosterLine[]
  prodigi: ProdigiRecord | null
  prodigi_error: { message: string; at: string } | null
}

type ProdigiStatus = { configured: boolean; env: string; skusMissing: string[]; reason?: string }

type RenderResult = { rendered: unknown[]; failed: { item_id: string; message: string }[] }

/**
 * Print files of the order's shader posters: download, or render them (again). Below, sending the
 * order to Prodigi: an admin's manual action, available once Prodigi is configured, every SKU is
 * chosen and every print file is rendered.
 */
const PosterPrintFilesWidget = ({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const queryClient = useQueryClient()
  const queryKey = ["poster-print-files", order.id]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => sdk.client.fetch<PrintFiles>(`/admin/orders/${order.id}/poster-print-files`),
  })
  const { data: prodigiStatus } = useQuery({
    queryKey: ["prodigi-status"],
    queryFn: () => sdk.client.fetch<ProdigiStatus>(`/admin/prodigi/status`),
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

  const sendToProdigi = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ prodigi: ProdigiRecord }>(`/admin/orders/${order.id}/prodigi`, { method: "POST", body: {} }),
    onSuccess: ({ prodigi }) => {
      queryClient.invalidateQueries({ queryKey })
      toast.success(`Sent to Prodigi (${prodigi.env}): ${prodigi.order_id}`)
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey })
      toast.error(error.message || "Prodigi refused the order")
    },
  })

  const posters = data?.posters ?? []
  // Orders without a shader poster don't show the widget.
  if (!isLoading && !posters.length) return null

  const missing = posters.some((poster) => !poster.print_file)
  const prodigi = data?.prodigi ?? null
  const blocker = !prodigiStatus
    ? "Checking Prodigi…"
    : !prodigiStatus.configured
      ? prodigiStatus.reason ?? "Prodigi isn't configured"
      : prodigiStatus.skusMissing.length
        ? `No Prodigi SKU chosen yet for ${prodigiStatus.skusMissing.length} size/frame pair(s)`
        : missing
          ? "Render every print file first"
          : null

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
          <div key={poster.item_id} className="flex items-center gap-3 px-6 py-4">
            {poster.thumbnail ? (
              <img
                src={poster.thumbnail}
                alt=""
                className="h-12 w-auto shrink-0 rounded-sm shadow-elevation-card-rest"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-y-1">
              <Text size="small" leading="compact" weight="plus" className="truncate">
                {poster.title ?? poster.poster_id ?? "Shader poster"} · {poster.quantity}×
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
      {!isLoading ? (
        <div className="flex flex-col gap-y-2 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Text size="small" leading="compact" weight="plus">
              Prodigi{prodigiStatus ? ` (${prodigiStatus.env})` : ""}
            </Text>
            {prodigi ? (
              <Badge size="2xsmall" color="green">
                {prodigi.order_id} · {prodigi.outcome}
              </Badge>
            ) : (
              <Button
                size="small"
                variant="secondary"
                isLoading={sendToProdigi.isPending}
                disabled={Boolean(blocker) || sendToProdigi.isPending}
                onClick={() => sendToProdigi.mutate()}
              >
                Send to Prodigi
              </Button>
            )}
          </div>
          {!prodigi && blocker ? (
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {blocker}
            </Text>
          ) : null}
          {!prodigi && data?.prodigi_error ? (
            <Text size="small" leading="compact" className="text-ui-fg-error">
              {data.prodigi_error.message}
            </Text>
          ) : null}
        </div>
      ) : null}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side",
})

export default PosterPrintFilesWidget
