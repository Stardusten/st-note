import { Component, createSignal, onMount } from "solid-js"
import IPCSearchBox from "./IPCSearchBox"

const SearchWindow: Component = () => {
  const [resetTrigger, setResetTrigger] = createSignal(0)

  onMount(() => {
    window.addEventListener("focus", () => {
      setResetTrigger((prev) => prev + 1)
    })
  })

  const handleClose = () => {
    window.api.hideSearchWindow()
  }

  return (
    <div
      class="h-full w-full flex flex-col rounded-md overflow-hidden"
      style={{
        background: "#181a1c",
        "box-shadow":
          "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
      }}>
      <IPCSearchBox onClose={handleClose} resetTrigger={resetTrigger()} />
    </div>
  )
}

export default SearchWindow
