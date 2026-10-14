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
      {
        id: 'b',
        mediaId: A.id,
        in: 4,
        out: 10,
        speed: 1,
        volume: 1,
        gap: 0,
        scale: 1,
        opacity: 1,
        rotation: 0
      }
    ])
    expect(timelineDuration(sequence.clips)).toBe(6)
  })

  it('reshapes the frame to a new aspect ratio around its short side', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'setAspect', width: 9, height: 16 })
    expect(sequence.format).toMatchObject({ width: 720, height: 1280 })
    sequence = editSequence(sequence, { type: 'setAspect', width: 4, height: 5 })
    expect(sequence.format).toMatchObject({ width: 720, height: 900 })
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

    sequence = editSequence(sequence, { type: 'closeGap', clipId: 'a' })
    expect(clipStarts(sequence.clips)).toEqual([0, 8])
  })

  it('drops a moved clip where it is released and only pushes clips it would overlap', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'c', media: B })
    const move = (clipId: string, start: number) => {
      sequence = editSequence(sequence, { type: 'moveClip', clipId, start })
      return sequence.clips.map((clip, index) => [clip.id, clipStarts(sequence.clips)[index]])
    }

    expect(move('b', 20)).toEqual([
      ['a', 0],
      ['c', 14],
      ['b', 20]
    ])
    expect(move('a', 30)).toEqual([
      ['c', 14],
      ['b', 20],
      ['a', 30]
    ])
    expect(move('a', 16)).toEqual([
      ['c', 14],
      ['a', 18],
      ['b', 28]
    ])
    expect(move('b', 19)).toEqual([
      ['c', 14],
      ['b', 18],
      ['a', 22]
    ])
  })

  it('reorders a clip on the magnetic track and closes every gap', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'c', media: B })
    sequence = editSequence(sequence, { type: 'moveClip', clipId: 'b', start: 20 })
    expect(clipStarts(sequence.clips)).toEqual([0, 14, 20])

    sequence = editSequence(sequence, { type: 'reorderClip', clipId: 'b', index: 0 })
    expect(sequence.clips.map((clip) => clip.id)).toEqual(['b', 'a', 'c'])
    expect(clipStarts(sequence.clips)).toEqual([0, 4, 14])

    expect(editSequence(sequence, { type: 'reorderClip', clipId: 'b', index: 0 })).toBe(sequence)
  })

  it('reorders clips and drops every use of removed media', () => {
    let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
    sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
    sequence = editSequence(sequence, { type: 'moveClip', clipId: 'b', start: 0 })
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
      {
        id: 'b',
        mediaId: B.id,
        in: 0,
        out: 4,
        speed: 2,
        volume: 1,
        gap: 0,
        scale: 1,
        opacity: 1,
        rotation: 0
      },
      {
        id: 'a',
        mediaId: A.id,
        in: 0,
        out: 2,
        speed: 1,
        volume: 1,
        gap: 1,
        scale: 1,
        opacity: 1,
        rotation: 0
      }
    ]
    expect(timelineDuration(clips)).toBe(5)
    expect(locate(clips, 1)).toMatchObject({ index: 0, sourceTime: 2 })
    expect(locate(clips, 2.5)).toMatchObject({ index: 1, inGap: true, sourceTime: 0 })
    expect(locate(clips, 4)).toMatchObject({ index: 1, clipStart: 3, sourceTime: 1, inGap: false })
    expect(locate([], 1)).toBeNull()
  })
})
