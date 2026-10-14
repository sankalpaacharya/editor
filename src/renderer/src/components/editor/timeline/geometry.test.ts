import { describe, expect, it } from 'vitest'
import { editSequence, emptySequence, type VideoMedia } from '../../../../../shared/sequence'
import { magnetIndex, magnetStarts } from './geometry'

const media = (id: string, duration: number): VideoMedia => ({
  id,
  kind: 'video',
  name: `${id}.mp4`,
  width: 1280,
  height: 720,
  duration,
  fps: 25,
  hasAudio: true
})
const A = media('00000000-0000-4000-8000-00000000000a', 10)
const B = media('00000000-0000-4000-8000-00000000000b', 4)

function threeClips() {
  let sequence = editSequence(emptySequence(), { type: 'addClip', clipId: 'a', media: A })
  sequence = editSequence(sequence, { type: 'addClip', clipId: 'b', media: B })
  sequence = editSequence(sequence, { type: 'addClip', clipId: 'c', media: B })
  return sequence.clips
}

describe('magnetIndex', () => {
  it('moves a dragged clip past every clip whose middle its middle has crossed', () => {
    const clips = threeClips()
    expect(magnetIndex(clips, 2, 14)).toBe(2)
    expect(magnetIndex(clips, 2, 9)).toBe(1)
    expect(magnetIndex(clips, 2, 0)).toBe(0)
    expect(magnetIndex(clips, 0, 5)).toBe(0)
    expect(magnetIndex(clips, 0, 8)).toBe(1)
  })

  it('measures the track as if its gaps were already closed', () => {
    const clips = editSequence(
      { ...emptySequence(), clips: threeClips() },
      { type: 'moveClip', clipId: 'c', start: 30 }
    ).clips
    expect(magnetIndex(clips, 2, 9)).toBe(1)
  })
})

describe('magnetStarts', () => {
  it('lays the other clips out end to end around the slot the dragged clip will take', () => {
    expect(magnetStarts(threeClips(), 'c', 0)).toEqual([4, 14, 0])
    expect(magnetStarts(threeClips(), 'a', 1)).toEqual([4, 0, 14])
  })
})
