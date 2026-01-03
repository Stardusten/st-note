import type { StObjectId } from "@renderer/lib/common/storage-types"

export type BlockContext = {
  nodeIndex: number
  node: any
  isMatch: boolean
}

export type BacklinkContext = {
  sourceCardId: StObjectId
  blocks: BlockContext[]
}
