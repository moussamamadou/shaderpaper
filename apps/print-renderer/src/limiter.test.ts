import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BusyError, Limiter } from './limiter.ts'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

describe('Limiter', () => {
  it('runs tasks one at a time, in order, and refuses beyond the queue', async () => {
    const limiter = new Limiter(1, 1)
    const order: string[] = []
    const first = deferred()
    const a = limiter.run(async () => {
      order.push('a start')
      await first.promise
      order.push('a end')
    })
    const b = limiter.run(async () => {
      order.push('b')
    })
    await assert.rejects(limiter.run(async () => {}), BusyError)
    assert.deepEqual([limiter.active, limiter.queued], [1, 1])

    first.resolve()
    await Promise.all([a, b])
    assert.deepEqual(order, ['a start', 'a end', 'b'])
    assert.deepEqual([limiter.active, limiter.queued], [0, 0])
  })

  it('frees the slot when a task fails', async () => {
    const limiter = new Limiter(1, 0)
    await assert.rejects(limiter.run(async () => Promise.reject(new Error('boom'))), /boom/)
    assert.equal(await limiter.run(async () => 'ok'), 'ok')
  })
})
