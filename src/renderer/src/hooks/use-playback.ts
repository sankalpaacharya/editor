import { useCallback, useEffect, useRef, useState } from 'react'
import { clipLength, locate, timelineDuration, type Clip } from '../../../shared/project'

// A media load resets playbackRate to defaultPlaybackRate, so both are set.
function setRate(video: HTMLVideoElement, speed: number) {
  video.defaultPlaybackRate = speed
  video.playbackRate = speed
}

// Adjacent clips that continue the same source (as after a split) play through without a seek.
const SEAMLESS = 0.05

export function usePlayback(clips: readonly Clip[]) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const clipsRef = useRef(clips)
  const playheadRef = useRef(0)
  const indexRef = useRef(0)
  const [playhead, setPlayheadState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const duration = timelineDuration(clips)

  const setPlayhead = useCallback((time: number) => {
    playheadRef.current = time
    setPlayheadState(time)
  }, [])

  const seekVideo = useCallback((time: number) => {
    const { index, clip, sourceTime } = locate(clipsRef.current, time)
    indexRef.current = index
    const video = videoRef.current
    if (!video) return
    setRate(video, clip.speed)
    if (Math.abs(video.currentTime - sourceTime) > 0.001) video.currentTime = sourceTime
  }, [])

  useEffect(() => {
    clipsRef.current = clips
    seekVideo(Math.min(playheadRef.current, timelineDuration(clips)))
  }, [clips, seekVideo])

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), timelineDuration(clipsRef.current))
      seekVideo(clamped)
      setPlayhead(clamped)
    },
    [seekVideo, setPlayhead]
  )

  useEffect(() => {
    const video = videoRef.current
    if (!playing || !video) return
    let frame = 0
    const tick = () => {
      const list = clipsRef.current
      const clip = list[indexRef.current]
      const clipStart = timelineDuration(list.slice(0, indexRef.current))
      if (video.currentTime >= clip.out) {
        const next = list[indexRef.current + 1]
        if (!next) {
          setPlayhead(timelineDuration(list))
          setPlaying(false)
          return
        }
        indexRef.current += 1
        setRate(video, next.speed)
        if (Math.abs(next.in - video.currentTime) > SEAMLESS) video.currentTime = next.in
        setPlayhead(clipStart + clipLength(clip))
      } else {
        setPlayhead(clipStart + Math.max(video.currentTime - clip.in, 0) / clip.speed)
      }
      frame = requestAnimationFrame(tick)
    }
    video.play().catch(() => setPlaying(false))
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      video.pause()
    }
  }, [playing, setPlayhead])

  const toggle = useCallback(() => {
    if (!playing && playheadRef.current >= timelineDuration(clipsRef.current) - 0.05) seek(0)
    setPlaying(!playing)
  }, [playing, seek])

  return { videoRef, playhead: Math.min(playhead, duration), playing, duration, seek, toggle }
}
