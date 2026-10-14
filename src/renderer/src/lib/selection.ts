// A gap is identified by the clip it sits in front of.
export interface SelectionItem {
  kind: 'clip' | 'overlay' | 'gap'
  id: string
}
export type Selection = readonly SelectionItem[]
export type Select = (item: SelectionItem | null, additive?: boolean) => void

export const isSelected = (selection: Selection, kind: SelectionItem['kind'], id: string) =>
  selection.some((item) => item.kind === kind && item.id === id)

export const onlySelected = (selection: Selection): SelectionItem | null =>
  selection.length === 1 ? selection[0] : null

export const isAdditive = (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) =>
  event.shiftKey || event.ctrlKey || event.metaKey

export function nextSelection(
  selection: Selection,
  item: SelectionItem | null,
  additive = false
): Selection {
  if (!item) return additive ? selection : []
  if (!additive) return [item]
  return isSelected(selection, item.kind, item.id)
    ? selection.filter((other) => other.kind !== item.kind || other.id !== item.id)
    : [...selection, item]
}
