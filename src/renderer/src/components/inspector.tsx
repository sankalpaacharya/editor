import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { NumberField } from '@/components/number-field'
import {
  clipLength,
  type Clip,
  type ImageOverlay,
  type Overlay,
  type Project,
  type ProjectAction,
  type TextOverlay
} from '../../../shared/project'
import { clamp, formatTime, type Selection } from '@/lib/editor'

interface InspectorProps {
  project: Project
  selection: Selection
  duration: number
  dispatch: (action: ProjectAction) => void
  onDelete: () => void
}

export function Inspector({ project, selection, duration, dispatch, onDelete }: InspectorProps) {
  const clipIndex =
    selection?.kind === 'clip' ? project.clips.findIndex((clip) => clip.id === selection.id) : -1
  const overlay =
    selection?.kind === 'overlay'
      ? project.overlays.find((candidate) => candidate.id === selection.id)
      : undefined
  const updateOverlay = (next: Overlay) => dispatch({ type: 'updateOverlay', overlay: next })

  let body: ReactNode = <p className="text-xs text-muted-foreground">Nothing selected</p>
  if (clipIndex !== -1) {
    body = (
      <ClipInspector
        key={project.clips[clipIndex].id}
        clip={project.clips[clipIndex]}
        index={clipIndex}
        count={project.clips.length}
        dispatch={dispatch}
        onDelete={onDelete}
      />
    )
  } else if (overlay?.kind === 'text') {
    body = (
      <TextInspector
        key={overlay.id}
        overlay={overlay}
        duration={duration}
        onChange={updateOverlay}
        onDelete={onDelete}
      />
    )
  } else if (overlay?.kind === 'image') {
    body = (
      <ImageInspector
        key={overlay.id}
        overlay={overlay}
        duration={duration}
        onChange={updateOverlay}
        onDelete={onDelete}
      />
    )
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-l p-3">
      {body}
    </aside>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-medium">{children}</h2>
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children(id)}
    </div>
  )
}

function DeleteButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="destructive" size="sm" onClick={onClick} disabled={disabled}>
      Delete
    </Button>
  )
}

interface ClipInspectorProps {
  clip: Clip
  index: number
  count: number
  dispatch: (action: ProjectAction) => void
  onDelete: () => void
}

function ClipInspector({ clip, index, count, dispatch, onDelete }: ClipInspectorProps) {
  const trim = (range: { in: number; out: number }) =>
    dispatch({ type: 'trim', clipId: clip.id, ...range })
  const move = (toIndex: number) => dispatch({ type: 'moveClip', clipId: clip.id, toIndex })
  return (
    <>
      <Heading>Clip {index + 1}</Heading>
      <Field label="In">
        {(id) => <NumberField id={id} value={clip.in} onCommit={(v) => trim({ ...clip, in: v })} />}
      </Field>
      <Field label="Out">
        {(id) => (
          <NumberField id={id} value={clip.out} onCommit={(v) => trim({ ...clip, out: v })} />
        )}
      </Field>
      <Field label="Duration">
        {() => <span className="text-xs tabular-nums">{formatTime(clipLength(clip))}</span>}
      </Field>
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => move(index - 1)} disabled={index === 0}>
          Move left
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => move(index + 1)}
          disabled={index === count - 1}
        >
          Move right
        </Button>
      </div>
      <DeleteButton onClick={onDelete} disabled={count === 1} />
    </>
  )
}

interface OverlayInspectorProps<T extends Overlay> {
  overlay: T
  duration: number
  onChange: (overlay: T) => void
  onDelete: () => void
}

function TextInspector({
  overlay,
  duration,
  onChange,
  onDelete
}: OverlayInspectorProps<TextOverlay>) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <>
      <Heading>Text</Heading>
      <Textarea
        value={draft ?? overlay.text}
        maxLength={500}
        onChange={(event) => {
          const text = event.target.value
          setDraft(text)
          if (text.length > 0) onChange({ ...overlay, text })
        }}
        onBlur={() => setDraft(null)}
        className="min-h-14 rounded-md px-2 py-1.5 text-xs md:text-xs"
      />
      <Field label="Size">
        {(id) => (
          <NumberField
            id={id}
            value={overlay.fontSize}
            step={1}
            digits={0}
            onCommit={(v) => onChange({ ...overlay, fontSize: clamp(v, 4, 1000) })}
          />
        )}
      </Field>
      <Field label="Color">
        {(id) => (
          <input
            id={id}
            type="color"
            value={overlay.color}
            onChange={(event) => onChange({ ...overlay, color: event.target.value })}
            className="h-7 w-full cursor-pointer rounded-md border bg-transparent p-0.5"
          />
        )}
      </Field>
      <Placement overlay={overlay} duration={duration} onChange={onChange} />
      <DeleteButton onClick={onDelete} />
    </>
  )
}

function ImageInspector({
  overlay,
  duration,
  onChange,
  onDelete
}: OverlayInspectorProps<ImageOverlay>) {
  return (
    <>
      <Heading>Image</Heading>
      <p className="truncate text-xs text-muted-foreground">{overlay.image.name}</p>
      <Field label="Scale">
        {(id) => (
          <PercentSlider
            id={id}
            value={overlay.scale}
            min={5}
            onChange={(scale) => onChange({ ...overlay, scale })}
          />
        )}
      </Field>
      <Placement overlay={overlay} duration={duration} onChange={onChange} />
      <DeleteButton onClick={onDelete} />
    </>
  )
}

function Placement<T extends Overlay>({
  overlay,
  duration,
  onChange
}: Omit<OverlayInspectorProps<T>, 'onDelete'>) {
  return (
    <>
      <Field label="X">
        {(id) => (
          <PercentSlider id={id} value={overlay.x} onChange={(x) => onChange({ ...overlay, x })} />
        )}
      </Field>
      <Field label="Y">
        {(id) => (
          <PercentSlider id={id} value={overlay.y} onChange={(y) => onChange({ ...overlay, y })} />
        )}
      </Field>
      <Field label="Start">
        {(id) => (
          <NumberField
            id={id}
            value={overlay.start}
            onCommit={(v) => onChange({ ...overlay, start: clamp(v, 0, overlay.end) })}
          />
        )}
      </Field>
      <Field label="End">
        {(id) => (
          <NumberField
            id={id}
            value={overlay.end}
            onCommit={(v) => onChange({ ...overlay, end: clamp(v, overlay.start, duration) })}
          />
        )}
      </Field>
    </>
  )
}

interface PercentSliderProps {
  id: string
  value: number
  min?: number
  onChange: (value: number) => void
}

function PercentSlider({ id, value, min = 0, onChange }: PercentSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <Slider
        id={id}
        value={[value * 100]}
        min={min}
        max={100}
        step={0.5}
        onValueChange={([percent]) => onChange(percent / 100)}
      />
      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}
