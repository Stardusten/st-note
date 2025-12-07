import { createSignal, onMount, onCleanup } from "solid-js"
import "./capture-success.css"

export function CaptureSuccessWindow() {
  const [visible, setVisible] = createSignal(false)
  let timer: number | null = null

  const startTimer = () => {
    // console.log('[CaptureSuccess] Starting timer')
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      // console.log('[CaptureSuccess] Timer done, closing window')
      window.api.captureSuccess.close()
    }, 3000)
  }

  const clearTimer = () => {
    // console.log('[CaptureSuccess] Clearing timer')
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const handleOpenClick = () => {
    window.api.captureSuccess.openLastCaptured()
  }

  onMount(() => {
    window.api.captureSuccess.onShow(() => {
      // console.log('[CaptureSuccess] onShow')
      setVisible(true)
      startTimer()
    })
    window.api.captureSuccess.onHide(() => {
      // console.log('[CaptureSuccess] onHide')
      setVisible(false)
      clearTimer()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        window.api.captureSuccess.openLastCaptured()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)

    onCleanup(() => {
      clearTimer()
      window.removeEventListener('keydown', handleKeyDown)
    })
  })

  const handleMouseEnter = () => {
    // console.log('[CaptureSuccess] Mouse Enter')
    clearTimer()
  }

  const handleMouseLeave = () => {
    // console.log('[CaptureSuccess] Mouse Leave')
    startTimer()
  }

  return (
    <div class="flex h-screen w-screen items-center justify-center bg-transparent select-none">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        class={`
          capture-capsule flex transform items-center gap-3 rounded-md
          py-2 px-3 text-zinc-100
          transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-top
          hover:scale-105 hover:shadow-2xl
          ${visible() ? "translate-y-0 opacity-100 scale-100" : "-translate-y-8 opacity-0 scale-95"}
        `}
        style={{
          "box-shadow": "rgba(0, 0, 0, 0.25) 0px 4px 24px, rgba(0, 0, 0, 0.5) 0px 8px 12px",
          background: "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
          border: "0.5px solid transparent"
        }}
      >
        {/* Success Check Animation */}
        <div class={`checkmark-wrapper relative flex h-5 w-5 items-center justify-center text-green-500 ${visible() ? 'active' : ''}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
          >
            {/* Hand-drawn style: Left -> Bottom -> Right */}
            <polyline
              points="4 12 9 17 20 6"
              class={`checkmark-path ${visible() ? 'active' : ''}`}
            />
          </svg>
        </div>

        <span class="text-[13px] font-medium tracking-wide">Captured</span>

        <div class="mx-0.5 h-3.5 w-px bg-zinc-700/80"></div>

        <div 
          onClick={handleOpenClick}
          class="group flex cursor-pointer items-center gap-1.5 rounded-md transition-colors"
        >
          <div class="flex items-center gap-1.5 text-sm text-zinc-400 hover:cursor-pointer group-hover:text-zinc-200 transition-colors">
            <span class="rounded border border-zinc-700/50 bg-zinc-800/50 px-1.5 py-0.5 min-w-[1.25rem] text-center shadow-sm transition-colors group-hover:border-zinc-500/50">⌘</span>
            <span class="rounded border border-zinc-700/50 bg-zinc-800/50 px-1.5 py-0.5 min-w-[1.25rem] text-center shadow-sm transition-colors group-hover:border-zinc-500/50">O</span>
            <span class="opacity-80 group-hover:opacity-100">to open</span>
          </div>
        </div>
      </div>
    </div>
  )
}
