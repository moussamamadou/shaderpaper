export class BusyError extends Error {}

/** Runs at most `concurrency` tasks at once; up to `queueLimit` more wait their turn. */
export class Limiter {
  #concurrency: number
  #queueLimit: number
  #active = 0
  #queue: Array<() => void> = []

  constructor(concurrency: number, queueLimit: number) {
    this.#concurrency = concurrency
    this.#queueLimit = queueLimit
  }

  get active(): number {
    return this.#active
  }

  get queued(): number {
    return this.#queue.length
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.#active < this.#concurrency) {
      this.#active++
    } else {
      if (this.#queue.length >= this.#queueLimit) throw new BusyError('Too many renders in progress')
      // The finishing task hands its slot over: #active stays the same.
      await new Promise<void>((resolve) => this.#queue.push(resolve))
    }
    try {
      return await task()
    } finally {
      const next = this.#queue.shift()
      if (next) next()
      else this.#active--
    }
  }
}
