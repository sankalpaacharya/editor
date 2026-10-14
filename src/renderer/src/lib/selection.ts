// A gap is identified by the clip it sits in front of.
export type Selection = { kind: 'clip' | 'overlay' | 'gap'; id: string } | null
