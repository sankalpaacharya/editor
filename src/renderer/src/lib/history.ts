import {
  editSequence,
  type MediaId,
  type Sequence,
  type SequenceAction
} from '../../../shared/sequence'

const LIMIT = 200

export interface History {
  past: Sequence[]
  present: Sequence
  future: Sequence[]
  coalesce: string | null
}

export type HistoryAction =
  | { type: 'edit'; action: SequenceAction; coalesce?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'forgetMedia'; mediaId: MediaId }

export function initialHistory(sequence: Sequence): History {
  return { past: [], present: sequence, future: [], coalesce: null }
}

export function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case 'edit': {
      const present = editSequence(state.present, action.action)
      if (present === state.present) return state
      const coalesce = action.coalesce ?? null
      if (coalesce !== null && coalesce === state.coalesce) {
        return { ...state, present, future: [] }
      }
      return { past: [...state.past, state.present].slice(-LIMIT), present, future: [], coalesce }
    }
    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        coalesce: null
      }
    }
    case 'redo': {
      const [next, ...future] = state.future
      if (!next) return state
      return { past: [...state.past, state.present], present: next, future, coalesce: null }
    }
    case 'forgetMedia': {
      const forget = (sequence: Sequence) =>
        editSequence(sequence, { type: 'removeMedia', mediaId: action.mediaId })
      return {
        past: state.past.map(forget),
        present: forget(state.present),
        future: state.future.map(forget),
        coalesce: null
      }
    }
  }
}
