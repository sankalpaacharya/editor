import { describe, expect, it } from 'vitest'
import { emptySequence, type VideoMedia } from '../../../shared/sequence'
import { historyReducer, initialHistory, type History } from './history'

const media: VideoMedia = {
  id: '00000000-0000-4000-8000-000000000001',
  kind: 'video',
  name: 'a.mp4',
  width: 1280,
  height: 720,
  duration: 10,
  fps: 30,
  hasAudio: true
}

const setVolume = (state: History, volume: number, coalesce: string) =>
  historyReducer(state, {
    type: 'edit',
    action: { type: 'setVolume', clipId: 'a', volume },
    coalesce
  })

describe('historyReducer', () => {
  it('undoes and redoes edits, and coalesces a drag into one step', () => {
    let state = initialHistory(emptySequence())
    state = historyReducer(state, { type: 'edit', action: { type: 'addClip', clipId: 'a', media } })
    for (const volume of [0.8, 0.5, 0.2]) state = setVolume(state, volume, 'drag-1')
    state = setVolume(state, 0.1, 'drag-2')
    expect(state.past).toHaveLength(3)

    state = historyReducer(state, { type: 'undo' })
    expect(state.present.clips[0].volume).toBe(0.2)
    state = historyReducer(state, { type: 'undo' })
    expect(state.present.clips[0].volume).toBe(1)
    state = historyReducer(state, { type: 'undo' })
    expect(state.present.clips).toEqual([])

    state = historyReducer(state, { type: 'redo' })
    state = historyReducer(state, { type: 'redo' })
    expect(state.present.clips[0].volume).toBe(0.2)
    expect(state.future).toHaveLength(1)

    state = setVolume(state, 0.6, 'drag-1')
    expect(state.future).toEqual([])
    expect(state.past).toHaveLength(3)
  })
})
