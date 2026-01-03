import { createSignal, createEffect, Show } from "solid-js"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@renderer/ui/solidui/dialog"
import { TextField, TextFieldInput, TextFieldLabel } from "@renderer/ui/solidui/text-field"
import { Button } from "@renderer/ui/solidui/button"

export type LinkEditData = {
  url: string
  text: string
}

export type LinkEditResult = LinkEditData | null

type LinkEditRequest = {
  initialUrl: string
  initialText: string
  isEditing: boolean
  resolve: (result: LinkEditResult) => void
}

const [currentRequest, setCurrentRequest] = createSignal<LinkEditRequest | null>(null)

export function showLinkEditDialog(initialUrl: string, initialText: string, isEditing: boolean): Promise<LinkEditResult> {
  return new Promise((resolve) => {
    setCurrentRequest({ initialUrl, initialText, isEditing, resolve })
  })
}

export function LinkEditDialog() {
  const [url, setUrl] = createSignal("")
  const [text, setText] = createSignal("")
  let urlInputRef: HTMLInputElement | undefined

  createEffect(() => {
    const req = currentRequest()
    if (req) {
      setUrl(req.initialUrl)
      setText(req.initialText)
      setTimeout(() => urlInputRef?.focus(), 50)
    }
  })

  const handleClose = () => {
    const req = currentRequest()
    if (req) req.resolve(null)
    setCurrentRequest(null)
  }

  const handleConfirm = () => {
    const req = currentRequest()
    if (req) req.resolve({ url: url(), text: text() })
    setCurrentRequest(null)
  }

  const handleRemove = () => {
    const req = currentRequest()
    if (req) req.resolve({ url: "", text: text() })
    setCurrentRequest(null)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={currentRequest() !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent class="sm:max-w-[400px] p-4 gap-3">
        <DialogHeader class="gap-1">
          <DialogTitle>{currentRequest()?.isEditing ? "Edit Link" : "Add Link"}</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-3">
          <TextField>
            <TextFieldLabel class="text-xs text-muted-foreground">URL</TextFieldLabel>
            <TextFieldInput
              ref={urlInputRef}
              value={url()}
              onInput={(e) => setUrl(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              class="h-8 text-sm"
            />
          </TextField>
          <TextField>
            <TextFieldLabel class="text-xs text-muted-foreground">Text</TextFieldLabel>
            <TextFieldInput
              value={text()}
              onInput={(e) => setText(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder="Link text"
              class="h-8 text-sm"
            />
          </TextField>
        </div>
        <DialogFooter class="gap-2 mt-1">
          <Show when={currentRequest()?.isEditing}>
            <Button variant="destructiveGhost" size="sm" onClick={handleRemove} class="mr-auto">
              Remove Link
            </Button>
          </Show>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!url().trim()}>
            {currentRequest()?.isEditing ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
