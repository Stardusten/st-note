export type CardSuggestion = {
  id: string
  title: string
}

export type CaptureNoteOptions = {
  content: any
  checked?: boolean
}

export type AppStoreInterface = {
  searchCards: (query: string) => Promise<CardSuggestion[]>
  createCard: (title?: string, content?: any) => Promise<CardSuggestion | null>
  captureNote: (options: CaptureNoteOptions) => Promise<void>
}
