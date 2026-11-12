// Guards for the live demo GIF (npm run capture:live). Plain functions over frame
// descriptors { width, height, delay } (delay in ms), so CI can test them with
// synthetic frames; demo.spec.js decodes the PNGs and calls these before writing.

export const MAX_GIF_DURATION_MS = 30_000

export function gifDurationMs(frames) {
  return frames.reduce((total, f) => total + f.delay, 0)
}

// One frame size for the whole GIF: a resize mid-recording makes a jumping demo.
// Returns the reason to refuse, or null when the sizes are uniform.
export function frameSizeProblem(frames) {
  if (frames.length === 0) return 'no frames were captured; refusing to write the GIF'
  const sizes = new Set(frames.map((f) => `${f.width}x${f.height}`))
  if (sizes.size > 1) {
    return `GIF frames differ in size (${[...sizes].join(', ')}); refusing to write the GIF`
  }
  return null
}

// The README demo stays under 30 s; only a GIF over the limit is refused.
// Returns the reason to refuse, or null when the total delay is within the limit.
export function durationProblem(frames) {
  const duration = gifDurationMs(frames)
  if (duration > MAX_GIF_DURATION_MS) {
    return `the GIF would run ${duration} ms, over the ${MAX_GIF_DURATION_MS} ms limit; refusing to write it`
  }
  return null
}

// Every reason to refuse this recording; empty means the GIF may be written.
export function gifFrameProblems(frames) {
  return [frameSizeProblem(frames), durationProblem(frames)].filter((p) => p !== null)
}
