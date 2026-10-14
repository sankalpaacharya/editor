import { useCallback, useEffect, useRef, useState } from 'react'
import {
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
    const list = clipsRef.current
    const first = list[indexRef.current]
    const firstVideo = first && activate(first)
    if (!firstVideo) {
      setPlaying(false)
      return
    }
    const all = videos.current
    let frame = 0
    const stop = () => {
      setPlaying(false)
      cancelAnimationFrame(frame)
    }
    const tick = () => {
      const clips = clipsRef.current
      const index = indexRef.current
      const clip = clips[index]
      const video = clip && videos.current.get(clip.mediaId)
      if (!video) return stop()
      const clipStart = timelineDuration(clips.slice(0, index))
      if (video.currentTime >= clip.out || video.ended) {
        const next = clips[index + 1]
        if (!next) {
          setPlayhead(timelineDuration(clips))
          return stop()
        }
        indexRef.current = index + 1
        const nextVideo = activate(next)
        if (!nextVideo) return stop()
        if (nextVideo !== video || Math.abs(next.in - video.currentTime) > SEAMLESS_GAP_SECONDS) {
          nextVideo.currentTime = next.in
        }
        if (nextVideo.paused) nextVideo.play().catch(stop)
        setPlayhead(clipStart + timelineLength(clip))
      } else {
        setPlayhead(clipStart + Math.max(video.currentTime - clip.in, 0) / clip.speed)
      }
      frame = requestAnimationFrame(tick)
    }
    firstVideo.play().catch(stop)
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
