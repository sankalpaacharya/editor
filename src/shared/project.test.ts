import { describe, expect, it } from 'vitest'
import { createProject, editProject, locate, timelineDuration, type MediaInfo } from './project'

const source: MediaInfo = {
  assetId: '00000000-0000-4000-8000-000000000000',
  name: 'clip.mp4',
  duration: 10,
  width: 640,
  height: 360,
  fps: 30,
  hasAudio: true
}

describe('editProject', () => {
  it('splits at the playhead, deletes the first half, and keeps the rest of the source', () => {
    let project = createProject(source, 'a')
    project = editProject(project, { type: 'split', time: 4, newClipId: 'b' })
    expect(project.clips).toEqual([
      { id: 'a', in: 0, out: 4, speed: 1 },
      { id: 'b', in: 4, out: 10, speed: 1 }
    ])

    project = editProject(project, { type: 'removeClip', clipId: 'a' })
    expect(project.clips).toEqual([{ id: 'b', in: 4, out: 10, speed: 1 }])
    expect(timelineDuration(project.clips)).toBe(6)
  })

  it('never removes the last clip', () => {
    const project = createProject(source, 'a')
    expect(editProject(project, { type: 'removeClip', clipId: 'a' })).toBe(project)
  })

  it('clamps trims to the source and to a minimum clip length', () => {
    const project = editProject(createProject(source, 'a'), {
      type: 'trim',
      clipId: 'a',
      in: 9.99,
      out: 50
    })
    expect(project.clips[0].out).toBe(10)
    expect(project.clips[0].out - project.clips[0].in).toBeCloseTo(0.1)
  })

  it('reorders clips', () => {
    let project = createProject(source, 'a')
    project = editProject(project, { type: 'split', time: 4, newClipId: 'b' })
    project = editProject(project, { type: 'moveClip', clipId: 'b', toIndex: 0 })
    expect(project.clips.map((clip) => clip.id)).toEqual(['b', 'a'])
  })
})

describe('locate', () => {
  it('maps timeline time to source time across reordered and sped-up clips', () => {
    const clips = [
      { id: 'b', in: 6, out: 10, speed: 2 },
      { id: 'a', in: 0, out: 2, speed: 1 }
    ]
    expect(timelineDuration(clips)).toBe(4)
    expect(locate(clips, 1)).toMatchObject({ index: 0, sourceTime: 8 })
    expect(locate(clips, 3)).toMatchObject({ index: 1, clipStart: 2, sourceTime: 1 })
    expect(locate(clips, 99)).toMatchObject({ index: 1, sourceTime: 2 })
  })
})
