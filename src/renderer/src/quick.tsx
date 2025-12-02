import "./assets/main.css"
import "./assets/solid-ui.css"

import { render } from "solid-js/web"
import QuickWindow from "./ui/quick-window/QuickWindow"

render(() => <QuickWindow />, document.getElementById("root") as HTMLElement)
