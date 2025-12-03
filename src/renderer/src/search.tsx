import "./assets/main.css"
import "./assets/solid-ui.css"

import { render } from "solid-js/web"
import SearchWindow from "./ui/search-window/SearchWindow"

render(() => <SearchWindow />, document.getElementById("root") as HTMLElement)
