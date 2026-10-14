import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clipStarts,
  locate,
  timelineDuration,
  timelineLength,
  type Clip,
  type MediaId
} from '../../../shared/sequence'

const SEAMLESS_GAP_SECONDS = 0.05
const PLAYING_SEEK_TOLERANCE_SECONDS = 0.25

export function usePlayback(clips: readonly Clip[], masterVolume: number) {
  const videos = useRef(new Map<MediaId, HTMLVideoElement>())
  const clipsRef = useRef(clips)
  const masterRef = useRef(masterVolume)
  const playheadRef = useRef(0)
  const indexRef = useRef(0)
  const playingRef = useRef(false)
  const inGapRef = useRef(false)
  // Gaps have no video to read time from, so they advance on the frame clock instead.
  const gapClockRef = useRef<{ from: number; at: number } | null>(null)
  const [playhead, setPlayheadState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [activeMediaId, setActiveMediaId] = useState<MediaId | null>(null)
  const duration = timelineDuration(clips)

  const setPlayhead = useCallback((time: number) => {
    playheadRef.current = time
    setPlayheadState(time)
  }, [])

  const activate = useCallback((clip: Clip): HTMLVideoElement | undefined => {
    for (const [id, other] of videos.current) if (id !== clip.mediaId) other.pause()
    setActiveMediaId(clip.mediaId)
    const video = videos.current.get(clip.mediaId)
    if (!video) return undefined
    // A media load resets playbackRate to defaultPlaybackRate, so both are set.
    video.defaultPlaybackRate = clip.speed
    video.playbackRate = clip.speed
    video.volume = clip.volume * masterRef.current
    return video
  }, [])

  const seekVideo = useCallback(
    (time: number) => {
      const position = locate(clipsRef.current, time)
      if (!position) {
        setActiveMediaId(null)
        return
      }
      indexRef.current = position.index
      inGapRef.current = position.inGap
      gapClockRef.current = null
      if (position.inGap) {
        for (const video of videos.current.values()) video.pause()
        setActiveMediaId(null)
        return
      }
      const video = activate(position.clip)
      if (!video) return
      const tolerance = playingRef.current ? PLAYING_SEEK_TOLERANCE_SECONDS : 0.001
      if (Math.abs(video.currentTime - position.sourceTime) > tolerance) {
        video.currentTime = position.sourceTime
      }
      if (playingRef.current && video.paused) video.play().catch(() => setPlaying(false))
    },
    [activate]
  )

  const registerVideo = useCallback(
    (id: MediaId, video: HTMLVideoElement | null) => {
      if (!video) {
        videos.current.delete(id)
        return
      }
      if (videos.current.get(id) === video) return
      videos.current.set(id, video)
      seekVideo(playheadRef.current)
    },
    [seekVideo]
  )

  useEffect(() => {
    clipsRef.current = clips
    const clamped = Math.min(playheadRef.current, timelineDuration(clips))
    if (clamped !== playheadRef.current) setPlayhead(clamped)
    seekVideo(clamped)
  }, [clips, seekVideo, setPlayhead])

  useEffect(() => {
    masterRef.current = masterVolume
    const clip = clipsRef.current[indexRef.current]
    const video = clip ? videos.current.get(clip.mediaId) : undefined
    if (video) video.volume = clip.volume * masterVolume
  }, [masterVolume])

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), timelineDuration(clipsRef.current))
      seekVideo(clamped)
      setPlayhead(clamped)
    },
    [seekVideo, setPlayhead]
  )

  useEffect(() => {
    playingRef.current = playing
    if (!playing) return
    const all = videos.current
    let frame = 0
    const stop = () => {
      setPlaying(false)
      cancelAnimationFrame(frame)
    }
    const enterClip = (clip: Clip): boolean => {
      inGapRef.current = false
      gapClockRef.current = null
      const video = activate(clip)
      if (!video) return false
      if (Math.abs(clip.in - video.currentTime) > SEAMLESS_GAP_SECONDS) video.currentTime = clip.in
      if (video.paused) video.play().catch(stop)
      return true
    }
    const tick = (now: number) => {
      const clips = clipsRef.current
      const index = indexRef.current
      const clip = clips[index]
      if (!clip) return stop()
      const clipStart = clipStarts(clips)[index]
      if (inGapRef.current) {
        gapClockRef.current ??= { from: playheadRef.current, at: now }
        const { from, at } = gapClockRef.current
        const time = from + (now - at) / 1000
        if (time < clipStart) setPlayhead(time)
        else if (!enterClip(clip)) return stop()
        frame = requestAnimationFrame(tick)
        return
      }
      const video = videos.current.get(clip.mediaId)
      if (!video) return stop()
      if (video.currentTime >= clip.out || video.ended) {
        const clipEnd = clipStart + timelineLength(clip)
        const next = clips[index + 1]
        setPlayhead(clipEnd)
        if (!next) return stop()
        indexRef.current = index + 1
        if (next.gap > 0) {
          video.pause()
          setActiveMediaId(null)
          inGapRef.current = true
          gapClockRef.current = { from: clipEnd, at: now }
        } else if (!enterClip(next)) {
          return stop()
        }
      } else {
        setPlayhead(clipStart + Math.max(video.currentTime - clip.in, 0) / clip.speed)
      }
      frame = requestAnimationFrame(tick)
    }
    const first = clipsRef.current[indexRef.current]
    if (!first) {
      setPlaying(false)
      return
    }
    if (!inGapRef.current) {
      const firstVideo = activate(first)
      if (!firstVideo) {
        setPlaying(false)
        return
      }
      firstVideo.play().catch(stop)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      for (const video of all.values()) video.pause()
    }
  }, [playing, activate, setPlayhead])

  const toggle = useCallback(() => {
    const total = timelineDuration(clipsRef.current)
    if (total === 0) return
    if (!playing && playheadRef.current >= total - 0.05) seek(0)
    setPlaying(!playing)
  }, [playing, seek])

  return {
    playhead: Math.min(playhead, duration),
    playing,
    duration,
    activeMediaId,
    registerVideo,
    seek,
    toggle
  }
}
