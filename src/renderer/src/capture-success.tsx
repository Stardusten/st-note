/* @refresh reload */
import "./assets/main.css"
import "./assets/solid-ui.css"

import { render } from "solid-js/web"
import { CaptureSuccessWindow } from "./ui/capture-success-window/CaptureSuccessWindow"

render(() => <CaptureSuccessWindow />, document.getElementById("root") as HTMLElement)
