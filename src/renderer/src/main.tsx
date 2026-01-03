import "./assets/main.css"
import "./assets/solid-ui.css"

import { render } from "solid-js/web"
import MainWindow from "./ui/main-window/MainWindow"
import { LinkEditDialog } from "./lib/editor/components/LinkEditDialog"

render(() => (
  <>
    <MainWindow />
    <LinkEditDialog />
  </>
), document.getElementById("root") as HTMLElement)
