import "./assets/main.css"
import "./assets/solid-ui.css"

import { render } from "solid-js/web"
import MainWindow from "./ui/main-window/MainWindow"

render(() => <MainWindow />, document.getElementById("root") as HTMLElement)
