import { base, keyName } from "w3c-keyname"

export type KeyBinding = {
  run: (e: KeyboardEvent) => boolean
  stopPropagation?: boolean
  preventDefault?: boolean
}

export type KeyBindingMap = Record<string, KeyBinding>

/**
 * Layer types determine how a layer participates in event handling:
 *
 * - `global`: Always active, lowest priority. Used for app-wide shortcuts.
 *
 * - `exclusive`: When active, blocks event propagation to lower layers even if
 *   no binding matches. Used for modals/dialogs that should "trap" keyboard focus.
 *
 * - `contextual`: Only active when `isActive()` returns true. Used for
 *   context-dependent shortcuts (e.g., list navigation only when editor is not focused).
 */
export type LayerType = "global" | "exclusive" | "contextual"

export interface KeymapLayer {
  id: string
  type: LayerType
  bindings: KeyBindingMap
  /** For contextual layers: check if this layer should be active */
  isActive?: () => boolean
}

const mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : false

/**
 * Normalize key name like "Cmd-D", "mod-s" to standard form
 */
function normalizeKeyName(name: string): string {
  const parts = name.split(/-(?!$)/)
  let result = parts[parts.length - 1]
  if (result === "Space") result = " "

  let alt = false, ctrl = false, shift = false, meta = false

  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i]
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true
    else if (/^a(lt)?$/i.test(mod)) alt = true
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true
    else if (/^s(hift)?$/i.test(mod)) shift = true
    else if (/^mod$/i.test(mod)) {
      if (mac) meta = true
      else ctrl = true
    }
  }

  if (alt) result = "Alt-" + result
  if (ctrl) result = "Ctrl-" + result
  if (meta) result = "Meta-" + result
  if (shift) result = "Shift-" + result

  return result
}

/**
 * Normalize all keys in a binding map
 */
function normalizeBindings(map: KeyBindingMap): KeyBindingMap {
  const result: KeyBindingMap = {}
  for (const key in map) {
    result[normalizeKeyName(key)] = map[key]
  }
  return result
}

/**
 * Build key name from event with modifiers
 */
function modifiers(name: string, event: KeyboardEvent, shift = true): string {
  if (event.altKey) name = "Alt-" + name
  if (event.ctrlKey) name = "Ctrl-" + name
  if (event.metaKey) name = "Meta-" + name
  if (shift && event.shiftKey) name = "Shift-" + name
  return name
}

/**
 * Helper to create a KeyBinding from a simple handler function
 */
export function kb(run: (e: KeyboardEvent) => boolean | void, options?: { stopPropagation?: boolean; preventDefault?: boolean }): KeyBinding {
  return {
    run: (e) => run(e) !== false,
    stopPropagation: options?.stopPropagation ?? true,
    preventDefault: options?.preventDefault ?? true
  }
}

/**
 * Helper to create bindings map from simple handlers
 */
export function bindings(map: Record<string, (e: KeyboardEvent) => boolean | void>): KeyBindingMap {
  const result: KeyBindingMap = {}
  for (const key in map) {
    result[key] = kb(map[key])
  }
  return result
}

class KeymapManagerImpl {
  private layers: KeymapLayer[] = []
  private listening = false

  /**
   * Start listening for keyboard events
   */
  init() {
    if (this.listening) return
    this.listening = true
    window.addEventListener("keydown", this.handleKeyDown, true)
  }

  /**
   * Stop listening
   */
  destroy() {
    if (!this.listening) return
    this.listening = false
    window.removeEventListener("keydown", this.handleKeyDown, true)
  }

  /**
   * Push a new layer onto the stack
   */
  pushLayer(config: {
    id: string
    type: LayerType
    bindings: KeyBindingMap
    isActive?: () => boolean
  }): KeymapLayer {
    const layer: KeymapLayer = {
      id: config.id,
      type: config.type,
      bindings: normalizeBindings(config.bindings),
      isActive: config.isActive
    }
    this.layers.push(layer)
    return layer
  }

  /**
   * Remove a layer from the stack
   */
  popLayer(layerId: string) {
    const idx = this.layers.findIndex((l) => l.id === layerId)
    if (idx >= 0) {
      this.layers.splice(idx, 1)
    }
  }

  /**
   * Get a layer by id
   */
  getLayer(layerId: string): KeymapLayer | undefined {
    return this.layers.find((l) => l.id === layerId)
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Skip if composing (IME)
    if (e.isComposing || e.keyCode === 229) return

    // Traverse layers from top to bottom
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]

      // Check if contextual layer is active
      if (layer.type === "contextual" && layer.isActive && !layer.isActive()) {
        continue
      }

      if (this.tryBinding(layer.bindings, e)) {
        return
      }

      // Exclusive layers block propagation even if no handler matched
      if (layer.type === "exclusive") {
        return
      }
    }
  }

  private tryBinding(bindings: KeyBindingMap, event: KeyboardEvent): boolean {
    const name = keyName(event)

    // Try direct match with all modifiers
    const direct = bindings[modifiers(name, event)]
    if (direct && direct.run(event)) {
      if (direct.stopPropagation) event.stopPropagation()
      if (direct.preventDefault) event.preventDefault()
      return true
    }

    // For single character keys
    if (name.length === 1 && name !== " ") {
      // Try without shift modifier
      if (event.shiftKey) {
        const noShift = bindings[modifiers(name, event, false)]
        if (noShift && noShift.run(event)) {
          if (noShift.stopPropagation) event.stopPropagation()
          if (noShift.preventDefault) event.preventDefault()
          return true
        }
      }

      // Try keyCode fallback for non-ASCII or modified keys
      if (
        (event.shiftKey || event.altKey || event.metaKey || name.charCodeAt(0) > 127) &&
        base[event.keyCode] &&
        base[event.keyCode] !== name
      ) {
        const fromCode = bindings[modifiers(base[event.keyCode], event)]
        if (fromCode && fromCode.run(event)) {
          if (fromCode.stopPropagation) event.stopPropagation()
          if (fromCode.preventDefault) event.preventDefault()
          return true
        }
      }
    }

    // Try wildcard
    const wildcard = bindings["*"]
    if (wildcard && wildcard.run(event)) {
      if (wildcard.stopPropagation) event.stopPropagation()
      if (wildcard.preventDefault) event.preventDefault()
      return true
    }

    return false
  }
}

export const keymapManager = new KeymapManagerImpl()
