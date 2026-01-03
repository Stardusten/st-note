import { render } from "solid-js/web"
import "@renderer/assets/solid-ui.css"
import EditorWindow from "@renderer/ui/editor-window/EditorWindow"
import { LinkEditDialog } from "@renderer/lib/editor/components/LinkEditDialog"

render(() => (
  <>
    <EditorWindow />
    <LinkEditDialog />
  </>
), document.getElementById("root")!)
