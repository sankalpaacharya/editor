import { createFrameEmitter } from '@/lib/audio/frame-source'
import type { FrameSource, MeterFrame } from '@/lib/audio/types'

export interface ProgramMeter {
  source: FrameSource<MeterFrame>
  attach: (video: HTMLVideoElement) => void
}

const toDb = (peak: number) => (peak > 0 ? 20 * Math.log10(peak) : Number.NEGATIVE_INFINITY)

// Routes every preview video through Web Audio so the program output can be metered. A media
// element can only ever have one source node, so attached elements are remembered for good.
export function createProgramMeter(): ProgramMeter {
  const frames = createFrameEmitter<MeterFrame>()
  const attached = new WeakSet<HTMLVideoElement>()
  let graph: { context: AudioContext; bus: GainNode } | null = null

  function start() {
    const context = new AudioContext()
    const bus = context.createGain()
    bus.channelCount = 2
    bus.channelCountMode = 'explicit'
    bus.channelInterpretation = 'speakers'
    const splitter = context.createChannelSplitter(2)
    bus.connect(splitter)
    const analysers = [0, 1].map((channel) => {
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      splitter.connect(analyser, channel)
      return analyser
    })
    const samples = new Float32Array(analysers[0].fftSize)
    const tick = () => {
      frames.emit({
        channels: analysers.map((analyser) => {
          analyser.getFloatTimeDomainData(samples)
          let peak = 0
          for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
          return { peakDb: toDb(peak) }
        })
      })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return { context, bus }
  }

  return {
    source: frames,
    attach(video) {
      if (attached.has(video)) return
      attached.add(video)
      graph ??= start()
      const node = graph.context.createMediaElementSource(video)
      node.connect(graph.context.destination)
      node.connect(graph.bus)
      video.addEventListener('play', () => void graph?.context.resume())
    }
  }
}
