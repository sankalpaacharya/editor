import { describe, expect, it } from 'vitest'
import {
  clipStarts,
  editSequence,
  emptySequence,
  locate,
  timelineDuration,
  type VideoMedia
} from './sequence'

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
      { id: 'b', mediaId: A.id, in: 4, out: 10, speed: 1, volume: 1, gap: 0 }
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

  it('opens and closes gaps on trim instead of shifting later clips', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
    const trim = (clipId: string, range: { in: number; out: number }, mediaDuration: number) => {
      sequence = editSequence(sequence, { type: 'trim', clipId, ...range, mediaDuration })
      return clipStarts(sequence.clips)
    }

    expect(trim('a', { in: 0, out: 8 }, A.duration)).toEqual([0, 10])
    expect(trim('b', { in: 1, out: 4 }, B.duration)).toEqual([0, 11])
    expect(trim('a', { in: 2, out: 8 }, A.duration)).toEqual([2, 11])
    expect(trim('b', { in: 0, out: 4 }, B.duration)).toEqual([2, 10])
    expect(trim('a', { in: 2, out: 10 }, A.duration)).toEqual([2, 10])
    expect(sequence.clips.map((clip) => clip.gap)).toEqual([2, 0])

    sequence = editSequence(sequence, { type: 'placeClip', clipId: 'a', start: 0 })
    expect(clipStarts(sequence.clips)).toEqual([0, 10])
    sequence = editSequence(sequence, { type: 'placeClip', clipId: 'a', start: 5 })
    expect(clipStarts(sequence.clips)).toEqual([2, 10])
  })

  it('reorders clips and drops every use of removed media', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
    sequence = editSequence(sequence, { type: 'moveClip', clipId: 'b', toIndex: 0 })
    expect(sequence.clips.map((clip) => clip.id)).toEqual(['b', 'a'])

    sequence = editSequence(sequence, { type: 'duplicateClip', clipId: 'b', newClipId: 'c' })
    expect(sequence.clips.map((clip) => clip.id)).toEqual(['b', 'c', 'a'])

    sequence = editSequence(sequence, { type: 'removeMedia', mediaId: B.id })
    expect(sequence.clips.map((clip) => clip.id)).toEqual(['a'])
  })
})

describe('locate', () => {
  it('maps timeline time to source time across clips of different media and speeds', () => {
    const clips = [
      { id: 'b', mediaId: B.id, in: 0, out: 4, speed: 2, volume: 1, gap: 0 },
      { id: 'a', mediaId: A.id, in: 0, out: 2, speed: 1, volume: 1, gap: 1 }
    ]
    expect(timelineDuration(clips)).toBe(5)
    expect(locate(clips, 1)).toMatchObject({ index: 0, sourceTime: 2 })
    expect(locate(clips, 2.5)).toMatchObject({ index: 1, inGap: true, sourceTime: 0 })
    expect(locate(clips, 4)).toMatchObject({ index: 1, clipStart: 3, sourceTime: 1, inGap: false })
    expect(locate([], 1)).toBeNull()
  })
})
