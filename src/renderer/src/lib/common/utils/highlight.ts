import { hybridTokenize, removeDiacritics } from "./search"

export type HighlightRange = [number, number]

export const findHighlightRanges = (text: string, query: string): HighlightRange[] => {
  if (!query.trim() || !text) return []

  const tokens = hybridTokenize(query, {
    includePrefix: false,
    cjkNGram: 1
  })

  if (tokens.length === 0) return []

  const ranges: HighlightRange[] = []
  const lowerText = removeDiacritics(text.toLowerCase())

  for (const token of tokens) {
    let pos = 0
    while ((pos = lowerText.indexOf(token, pos)) !== -1) {
      ranges.push([pos, pos + token.length])
      pos += 1
    }
  }

  if (ranges.length === 0) return []

  ranges.sort((a, b) => a[0] - b[0])

  const merged: HighlightRange[] = [ranges[0]]
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]
    if (ranges[i][0] <= last[1]) {
      last[1] = Math.max(last[1], ranges[i][1])
    } else {
      merged.push(ranges[i])
    }
  }

  return merged
}
