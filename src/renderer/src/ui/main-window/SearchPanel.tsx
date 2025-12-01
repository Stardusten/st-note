import { FileIcon } from "lucide-solid"
import { TextField, TextFieldInput } from "../solidui/text-field"

const SearchPanel = () => {
  return (
    <div class="fixed top-0 left-0 h-screen w-screen flex items-center justify-center bg-[#000]/20">
      <div
        class="relative w-[650px] h-[80vh] flex flex-col border rounded-md bg-[#181a1c]"
        style={{
          "box-shadow":
            "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
        }}>
        <hr
          class="absolute -z-0 top-[45px] h-[1px] w-full bg-[#000]/40 border-[#fff]/20"
          style={{
            "border-width": "0px 0px 0.5px"
          }}></hr>
        <TextField class="px-5 pt-4">
          <TextFieldInput
            class="h-[60px] z-1 placeholder:text-lg placeholder:text-muted-foreground"
            style={{
              background:
                "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
              "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
              border: "0.5px solid transparent"
            }}
            placeholder="Find, create or ask AI"
          />
        </TextField>

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="px-5 py-[13px] text-muted-foreground/60 font-medium text-[0.625rem] py-[8px] tracking-[0.8px]">
            RESULTS
          </div>
          <div class="flex-1 overflow-y-auto">
            <div class="h-[2px]"></div>
            <div
              class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm bg-[#25262a] rounded-md"
              style={{
                "border-color": "transparent",
                "box-shadow":
                  "rgba(78, 79, 82, 0.9) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px"
              }}>
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
              <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[20px]"></div>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
            <div class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm">
              <FileIcon class="size-4 stroke-[1.5px] mr-2" />
              <span>现在支持嵌入一个段落，却不支持直接嵌入一个 Card。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPanel
