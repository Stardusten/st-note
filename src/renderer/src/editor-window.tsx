import { render } from "solid-js/web"
import "@renderer/assets/solid-ui.css"
import EditorWindow from "@renderer/ui/editor-window/EditorWindow"

render(() => <EditorWindow />, document.getElementById("root")!)
