import { type Component } from "solid-js"
import { Tabs, TabsList, TabsTrigger } from "@renderer/ui/solidui/tabs"

type Props = {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TitleBar: Component<Props> = (props) => {
  return (
    <div class="relative flex items-center justify-center shrink-0 z-1000 bg-muted h-[36px]">
      <div
        class="absolute top-0 left-0 right-0 bottom-0 select-none"
        style={{ "-webkit-app-region": "drag", "-webkit-user-select": "none" }}
      />
      <div class="relative z-1 flex items-center" style={{ "-webkit-app-region": "no-drag" }}>
        <Tabs value={props.activeTab} onChange={props.setActiveTab}>
          <TabsList class="h-[26px] bg-gray-200">
            <TabsTrigger value="search" class="h-[20px] font-normal text-[12px] cursor-pointer">
              Search
            </TabsTrigger>
            <TabsTrigger value="tasks" class="h-[20px] font-normal text-[12px] cursor-pointer">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="timeline" class="h-[20px] font-normal text-[12px] cursor-pointer">
              Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}

export default TitleBar
