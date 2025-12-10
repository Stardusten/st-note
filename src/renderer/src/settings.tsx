import { render } from "solid-js/web"
import "@renderer/assets/solid-ui.css"
import SettingsWindow from "@renderer/ui/settings-window/SettingsWindow"

render(() => <SettingsWindow />, document.getElementById("root")!)
