import { render } from "solid-js/web"
import "@renderer/assets/solid-ui.css"
import ImageViewer from "@renderer/ui/image-viewer/ImageViewer"

render(() => <ImageViewer />, document.getElementById("root")!)
