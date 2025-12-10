import { Component, createMemo, For, JSX } from "solid-js"
import { findHighlightRanges } from "@renderer/lib/common/utils/highlight"

const HighlightedText: Component<{ text: string; query: string }> = (props) => {
  const parts = createMemo(() => {
    if (!props.query.trim()) return [{ text: props.text, highlight: false }]
    const ranges = findHighlightRanges(props.text, props.query)
    if (ranges.length === 0) return [{ text: props.text, highlight: false }]

    const result: { text: string; highlight: boolean }[] = []
    let lastEnd = 0
    for (const [start, end] of ranges) {
      if (start > lastEnd) result.push({ text: props.text.slice(lastEnd, start), highlight: false })
      result.push({ text: props.text.slice(start, end), highlight: true })
      lastEnd = end
    }
    if (lastEnd < props.text.length)
      result.push({ text: props.text.slice(lastEnd), highlight: false })
    return result
  })

  return (
    <>
      <For each={parts()}>
        {(part) =>
          part.highlight ? (
            <mark class="bg-highlight text-inherit">{part.text}</mark>
          ) : (
            <>{part.text}</>
          )
        }
      </For>
    </>
  ) as JSX.Element
}

export default HighlightedText
