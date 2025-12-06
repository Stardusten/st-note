import { Component, createSignal } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import SearchBox from "../common/SearchBox"

type SearchPanelProps = {
  onClose?: () => void
}

const SearchPanel: Component<SearchPanelProps> = (props) => {
  const [resetTrigger, setResetTrigger] = createSignal(0)

  const handleSelectCard = (cardId: string) => {
    appStore.selectCard(cardId)
    props.onClose?.()
  }

  const handleCreateNote = async (title: string) => {
    await appStore.createCard(title)
    props.onClose?.()
  }

  const handleClose = () => {
    setResetTrigger((prev) => prev + 1)
    props.onClose?.()
  }

  return (
    <div class="fixed z-50 top-0 left-0 h-screen w-screen flex items-start justify-center pt-[80px] bg-[#000]/40">
      <div class="absolute inset-0" onClick={handleClose} />
      <div
        class="relative w-[650px] max-h-[80vh] flex flex-col border rounded-md bg-[#181a1c] z-10"
        style={{
          "box-shadow":
            "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
        }}>
        <SearchBox
          onSelectCard={handleSelectCard}
          onCreateNote={handleCreateNote}
          onClose={handleClose}
          resetTrigger={resetTrigger()}
        />
      </div>
    </div>
  )
}

export default SearchPanel
