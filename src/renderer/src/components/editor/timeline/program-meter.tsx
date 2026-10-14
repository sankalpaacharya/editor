import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterHold,
  LevelMeterScale,
  LevelMeterTrack
} from '@/components/ui/level-meter'
import type { FrameSource, MeterFrame, MeterZone } from '@/lib/audio/types'

const ZONES: MeterZone[] = [
  { fromDb: -60, zone: 'ok' },
  { fromDb: -6, zone: 'warn' },
  { fromDb: -1, zone: 'clip' }
]

export function ProgramMeter({ source }: { source: FrameSource<MeterFrame> }) {
  return (
    <div className="flex w-16 shrink-0 flex-col border-l px-2 py-3">
      <LevelMeter
        aria-label="Program level"
        source={source}
        channelCount={2}
        orientation="vertical"
        minDb={-60}
        maxDb={6}
        zones={ZONES}
        className="min-h-0 flex-1"
      >
        <LevelMeterChannels>
          {[0, 1].map((index) => (
            <LevelMeterChannel key={index} index={index}>
              <LevelMeterTrack>
                <LevelMeterBar />
                <LevelMeterHold />
              </LevelMeterTrack>
            </LevelMeterChannel>
          ))}
          <LevelMeterScale />
        </LevelMeterChannels>
      </LevelMeter>
      <div className="mt-1 flex justify-around pr-4 text-[10px] text-muted-foreground">
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  )
}
