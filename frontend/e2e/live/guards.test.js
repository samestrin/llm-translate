import { describe, expect, it } from 'vitest'
import {
  MAX_GIF_DURATION_MS,
  durationProblem,
  frameSizeProblem,
  gifDurationMs,
  gifFrameProblems,
} from './guards.js'

// Synthetic frames: the guards see only { width, height, delay } descriptors, never PNG bytes.
const frame = (delay, width = 1280, height = 800) => ({ width, height, delay })
const session = (delays) => delays.map((d) => frame(d))

describe('frameSizeProblem', () => {
  it('passes one frame and many same-size frames', () => {
    expect(frameSizeProblem([frame(1500)])).toBeNull()
    expect(frameSizeProblem(session([2000, 1500, 4500, 1500, 5000, 3500]))).toBeNull()
  })

  it('refuses mixed widths', () => {
    const problem = frameSizeProblem([frame(1000), frame(1000, 640, 800)])
    expect(problem).toContain('1280x800')
    expect(problem).toContain('640x800')
  })

  it('refuses mixed heights (the default Desktop Chrome viewport is 1280x720)', () => {
    const problem = frameSizeProblem([frame(1000), frame(1000, 1280, 720)])
    expect(problem).toContain('1280x800')
    expect(problem).toContain('1280x720')
  })

  it('refuses a recording with no frames', () => {
    expect(frameSizeProblem([])).toMatch(/no frames/i)
  })
})

describe('durationProblem', () => {
  it('passes frames whose delays total under 30 s', () => {
    expect(durationProblem(session([2000, 1500, 4500, 1500, 5000, 3500]))).toBeNull() // 18 s
    expect(durationProblem(session([29_999]))).toBeNull()
  })

  it('passes exactly 30 s: only a GIF over 30 s is refused', () => {
    expect(MAX_GIF_DURATION_MS).toBe(30_000)
    expect(durationProblem(session([15_000, 15_000]))).toBeNull()
  })

  it('refuses frames whose delays total over 30 s', () => {
    expect(durationProblem(session([30_001]))).toMatch(/30001/)
    expect(durationProblem(session([20_000, 12_000]))).toMatch(/32000/)
  })

  it('passes an empty recording (the size guard refuses that one)', () => {
    expect(durationProblem([])).toBeNull()
  })
})

describe('gifDurationMs', () => {
  it('sums the frame delays in milliseconds', () => {
    expect(gifDurationMs(session([2000, 1500, 4500]))).toBe(8000)
    expect(gifDurationMs([])).toBe(0)
  })
})

describe('gifFrameProblems', () => {
  it('passes a same-size session under 30 s', () => {
    expect(gifFrameProblems(session([2000, 1500, 4500, 1500, 5000, 3500]))).toEqual([])
  })

  it('refuses mixed sizes and over 30 s, naming each problem', () => {
    const mixed = [frame(20_000), frame(20_000, 1280, 720)]
    const problems = gifFrameProblems(mixed)
    expect(problems).toHaveLength(2)
    expect(problems.some((p) => p.includes('1280x720'))).toBe(true)
    expect(problems.some((p) => p.includes('40000'))).toBe(true)
  })

  it('refuses a recording with no frames', () => {
    expect(gifFrameProblems([]).length).toBeGreaterThan(0)
  })

  it('does not mutate the frames it checks', () => {
    const frames = session([2000, 1500])
    const before = JSON.stringify(frames)
    gifFrameProblems(frames)
    expect(JSON.stringify(frames)).toBe(before)
  })
})
