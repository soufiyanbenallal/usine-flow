import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { enqueue, listQueue, syncQueue } from './queue'

const base = { organizationId: 'org1', type: 'count_line' as const, label: 'Comptage' }

describe('offline queue', () => {
  it('enqueues in order and removes applied operations', async () => {
    const a = await enqueue({ ...base, payload: { line: 'a', counted: 1 } })
    const b = await enqueue({ ...base, payload: { line: 'b', counted: 2 } })
    expect((await listQueue('org1')).map((o) => o.id)).toEqual([a.id, b.id])
    const seen: string[] = []
    const res = await syncQueue('org1', async (op) => { seen.push(op.id); return { status: 'applied' } })
    expect(seen).toEqual([a.id, b.id])
    expect(res).toEqual({ applied: 2, rejected: 0, remaining: 0 })
    expect(await listQueue('org1')).toHaveLength(0)
  })

  it('stops at the first network failure and keeps order', async () => {
    const a = await enqueue({ ...base, payload: { line: 'a' } })
    await enqueue({ ...base, payload: { line: 'b' } })
    let calls = 0
    const res = await syncQueue('org1', async () => { calls++; throw new Error('offline') })
    expect(calls).toBe(1)
    expect(res.remaining).toBe(2)
    expect((await listQueue('org1'))[0]).toMatchObject({ id: a.id, attempts: 1, error: 'offline' })
    await syncQueue('org1', async () => ({ status: 'applied' }))
  })

  it('keeps rejected operations for review', async () => {
    await enqueue({ ...base, payload: { line: 'x' } })
    const res = await syncQueue('org1', async () => ({ status: 'rejected', error: 'Ligne introuvable.' }))
    expect(res).toMatchObject({ rejected: 1, remaining: 0 })
    const left = await listQueue('org1')
    expect(left[0]).toMatchObject({ status: 'rejected', error: 'Ligne introuvable.' })
  })
})
