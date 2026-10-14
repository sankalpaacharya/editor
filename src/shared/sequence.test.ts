import { describe, expect, it } from 'vitest'
import { editSequence, emptySequence, locate, timelineDuration, type VideoMedia } from './sequence'

const media = (id: string, duration: number): VideoMedia => ({
  id,
  kind: 'video',
  name: `${id}.mp4`,
  width: 1279,
  height: 719,
  duration,
  fps: 25,
  hasAudio: true
})
const A = media('00000000-0000-4000-8000-00000000000a', 10)
const B = media('00000000-0000-4000-8000-00000000000b', 4)

describe('editSequence', () => {
  it('adopts the first clip format, splits, deletes, and keeps the rest of the source', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    expect(sequence.format).toEqual({ width: 1280, height: 720, fps: 25 })

    sequence = editSequence(sequence, { type: 'split', time: 4, newClipId: 'b' })
    sequence = editSequence(sequence, { type: 'removeClip', clipId: 'a' })
    expect(sequence.clips).toEqual([
      { id: 'b', mediaId: A.id, in: 4, out: 10, speed: 1, volume: 1 }
    ])
    expect(timelineDuration(sequence.clips)).toBe(6)
  })

  it('clamps trims to the media and to a minimum clip length', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, {
      type: 'trim',
      clipId: 'a',
      in: 9.99,
      out: 50,
      mediaDuration: A.duration
    })
    expect(sequence.clips[0].out).toBe(10)
    expect(sequence.clips[0].out - sequence.clips[0].in).toBeCloseTo(0.1)
  })

  it('reorders clips and drops every use of removed media', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
    sequence = editSequence(sequence, { type: 'moveClip', clipId: 'b', toIndex: 0 })
    expect(sequence.clips.map((clip) => clip.id)).toEqual(['b', 'a'])

    sequence = editSequence(sequence, { type: 'removeMedia', mediaId: B.id })
    expect(sequence.clips.map((clip) => clip.id)).toEqual(['a'])
  })
})

describe('locate', () => {
  it('maps timeline time to source time across clips of different media and speeds', () => {
    const clips = [
      { id: 'b', mediaId: B.id, in: 0, out: 4, speed: 2, volume: 1 },
      { id: 'a', mediaId: A.id, in: 0, out: 2, speed: 1, volume: 1 }
    ]
    expect(timelineDuration(clips)).toBe(4)
    expect(locate(clips, 1)).toMatchObject({ index: 0, sourceTime: 2 })
    expect(locate(clips, 3)).toMatchObject({ index: 1, clipStart: 2, sourceTime: 1 })
    expect(locate([], 1)).toBeNull()
  })
})
