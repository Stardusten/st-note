# Backlinks 实现计划

## 目标

让 Content.tsx 中的 Backlinks 和 Potential Links 真正能用：
1. **Backlinks**: 显示所有引用当前 Card 的其他 Card，高亮引用位置及其缩进子块
2. **Potential Links**: 显示可能相关但尚未建立引用的 Card（基于模糊匹配）

## 架构设计

### 核心思路

1. **ObjCache 成为事件源**: 在事务提交后发出事件，通知订阅者数据已更改
2. **BacklinkIndex**: 独立模块，订阅 ObjCache 事件，维护反向链接索引
3. **响应式暴露**: 通过 SolidJS Signal 暴露索引数据，UI 自动更新

### 模块设计原则（遵循项目规范）

- 通过 `init()` 注入依赖，无参构造函数
- BacklinkIndex 作为独立模块，在 AppStore 中组装
- 松散耦合，易于测试

### 文档结构理解

当前 ProseMirror 文档使用扁平结构 + indent 属性：
```json
{
  "type": "doc",
  "content": [
    { "type": "title", "attrs": { "level": 1 }, "content": [...] },
    { "type": "paragraph", "attrs": { "indent": 0 }, "content": [...] },
    { "type": "paragraph", "attrs": { "indent": 1 }, "content": [...] },
    { "type": "paragraph", "attrs": { "indent": 2 }, "content": [...] },
    { "type": "paragraph", "attrs": { "indent": 0 }, "content": [...] }
  ]
}
```

**"匹配块及其缩进子块"** 的逻辑：
- 找到包含 cardRef 的块（假设 indent=1）
- 向后遍历，收集所有 indent > 1 的连续块
- 遇到 indent <= 1 的块时停止

## 实现步骤

### Step 1: 为 ObjCache 添加事件机制

**文件**: `src/renderer/src/lib/objcache/objcache.ts`

```typescript
type TxOp = {
  op: 'create' | 'update' | 'delete'
  id: StObjectId
  object?: StObject
  oldObject?: StObject
}

type ObjCacheEvent = {
  type: 'committed'
  ops: TxOp[]
}

type ObjCacheListener = (event: ObjCacheEvent) => void
```

在 ObjCache 类中添加：
- `private listeners: Set<ObjCacheListener>`
- `subscribe(listener): () => void` - 返回取消订阅函数
- `private emit(event)` - 事务提交后调用

### Step 2: 创建 BacklinkIndex 模块

**目录**: `src/renderer/src/lib/backlink/`

**文件结构**:
- `types.ts` - 类型定义
- `utils.ts` - 工具函数（extractCardRefs, extractBlocksWithContext）
- `BacklinkIndex.ts` - 主实现

**类型定义** (`types.ts`):
```typescript
import type { StObjectId } from "../common/types"

type BacklinkContext = {
  sourceCardId: StObjectId
  blocks: BlockContext[]
}

type BlockContext = {
  nodeIndex: number
  node: any
  isMatch: boolean
}

type BacklinkIndexInterface = {
  init(objCache: ObjCache): Promise<void>
  getBacklinks(cardId: StObjectId): Accessor<BacklinkContext[]>
  getPotentialLinks(cardId: StObjectId, title: string): Accessor<BacklinkContext[]>
  dispose(): void
}
```

**工具函数** (`utils.ts`):
```typescript
// 提取文档中所有 cardRef 的 cardId
function extractCardRefs(content: any): StObjectId[]

// 提取包含特定 cardRef 的块及其缩进子块
function extractBlocksWithCardRef(
  content: any,
  targetCardId: StObjectId
): BlockContext[]

// 提取包含特定文本的块及其缩进子块（用于 Potential Links）
function extractBlocksWithText(
  content: any,
  searchText: string
): BlockContext[]

// 从块索引开始，收集其所有缩进子块
function collectIndentedChildren(
  blocks: any[],
  startIndex: number,
  baseIndent: number
): number[]
```

**主实现** (`BacklinkIndex.ts`):
```typescript
class BacklinkIndex implements BacklinkIndexInterface {
  private objCache: ObjCache | null = null
  private unsubscribe: (() => void) | null = null

  // cardId -> Signal<Set<引用它的 cardId>>
  private forwardIndex: Map<StObjectId, Set<StObjectId>> = new Map()

  // 响应式 Signal，当索引变化时更新
  private indexVersion: Accessor<number>
  private setIndexVersion: Setter<number>

  // 防抖
  private pendingUpdates: Set<StObjectId> = new Set()
  private debounceTimer: NodeJS.Timeout | null = null
  private readonly debounceMs: number = 500

  constructor() {
    const [indexVersion, setIndexVersion] = createSignal(0)
    this.indexVersion = indexVersion
    this.setIndexVersion = setIndexVersion
  }

  async init(objCache: ObjCache): Promise<void>
  getBacklinks(cardId: StObjectId): Accessor<BacklinkContext[]>
  getPotentialLinks(cardId: StObjectId, title: string): Accessor<BacklinkContext[]>
  dispose(): void
}
```

### Step 3: 索引构建和更新逻辑

**初始化时构建完整索引**:
```typescript
async init(objCache: ObjCache) {
  this.objCache = objCache

  // 构建初始索引
  // 遍历所有 card，提取 cardRef，建立反向索引

  // 订阅变更
  this.unsubscribe = objCache.subscribe(this.handleEvent)
}
```

**增量更新**:
```typescript
private handleEvent = (event: ObjCacheEvent) => {
  for (const op of event.ops) {
    if (op.object?.type === 'card' || op.oldObject?.type === 'card') {
      this.pendingUpdates.add(op.id)
    }
  }
  this.scheduleUpdate()
}

private scheduleUpdate() {
  if (this.debounceTimer) clearTimeout(this.debounceTimer)
  this.debounceTimer = setTimeout(() => {
    this.processPendingUpdates()
  }, this.debounceMs)
}
```

### Step 4: getBacklinks 实现

```typescript
getBacklinks(cardId: StObjectId): Accessor<BacklinkContext[]> {
  return () => {
    // 触发响应式依赖
    this.indexVersion()

    const sourceCardIds = this.forwardIndex.get(cardId) || new Set()
    const results: BacklinkContext[] = []

    for (const sourceId of sourceCardIds) {
      const card = this.objCache?.get(sourceId)()
      if (!card || card.type !== 'card') continue

      const blocks = extractBlocksWithCardRef(card.data.content, cardId)
      results.push({ sourceCardId: sourceId, blocks })
    }

    return results
  }
}
```

### Step 5: getPotentialLinks 实现

```typescript
getPotentialLinks(cardId: StObjectId, title: string): Accessor<BacklinkContext[]> {
  return () => {
    this.indexVersion()

    if (!title.trim()) return []

    const results: BacklinkContext[] = []
    const existingBacklinks = this.forwardIndex.get(cardId) || new Set()

    // 遍历所有 card，模糊搜索
    // 排除自己和已有 backlink 的 card
    // 使用 prepareFuzzySearch 进行模糊匹配

    return results
  }
}
```

### Step 6: 集成到 AppStore

**文件**: `src/renderer/src/lib/state/AppStore.ts`

```typescript
import { BacklinkIndex } from "../backlink/BacklinkIndex"

class AppStore {
  private backlinkIndex: BacklinkIndex

  constructor() {
    // ... existing
    this.backlinkIndex = new BacklinkIndex()
  }

  async init(dbPath: string = "notes.db") {
    await this.storage.init(dbPath)
    await this.objCache.init(this.storage)
    await this.backlinkIndex.init(this.objCache)
    await this.loadCards()
  }

  getBacklinks(cardId: StObjectId) {
    return this.backlinkIndex.getBacklinks(cardId)
  }

  getPotentialLinks(cardId: StObjectId) {
    const card = this.getCurrentCard()
    const title = card ? getCardTitle(card) : ''
    return this.backlinkIndex.getPotentialLinks(cardId, title)
  }
}
```

### Step 7: 更新 UI 组件

**Content.tsx**:
```tsx
const Content: Component = () => {
  const currentCardId = () => appStore.getCurrentCardId()

  const backlinks = () => {
    const id = currentCardId()
    return id ? appStore.getBacklinks(id)() : []
  }

  const potentialLinks = () => {
    const id = currentCardId()
    return id ? appStore.getPotentialLinks(id)() : []
  }

  return (
    // ...
    <div class="...">
      <span>Backlinks</span>
      <span class="...">{backlinks().length}</span>
    </div>
    <For each={backlinks()}>
      {(backlink) => (
        <CardBacklinkEditor
          cardId={backlink.sourceCardId}
          blocks={backlink.blocks}
        />
      )}
    </For>
    // ...
  )
}
```

**CardBacklinkEditor.tsx**:
```tsx
type CardBacklinkEditorProps = {
  cardId: StObjectId
  blocks: BlockContext[]
}

const CardBacklinkEditor: Component<CardBacklinkEditorProps> = (props) => {
  const card = () => appStore.getCards().find(c => c.id === props.cardId)

  return (
    <div class="...">
      <div class="card-title">{card() ? getCardTitle(card()!) : 'Untitled'}</div>
      <div class="blocks">
        <For each={props.blocks}>
          {(block) => (
            <div
              class={block.isMatch ? 'highlight' : ''}
              style={{ 'padding-left': `${(block.node.attrs?.indent || 0) * 24}px` }}
            >
              {/* 渲染块内容，高亮 cardRef */}
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
```

## 文件清单

### 需要修改的文件
1. `src/renderer/src/lib/objcache/objcache.ts` - 添加事件机制
2. `src/renderer/src/lib/state/AppStore.ts` - 集成 BacklinkIndex
3. `src/renderer/src/ui/main-window/Content.tsx` - 使用真实数据
4. `src/renderer/src/ui/main-window/CardBacklinkEditor.tsx` - 接收 props 显示内容

### 需要新建的文件
1. `src/renderer/src/lib/backlink/types.ts` - 类型定义
2. `src/renderer/src/lib/backlink/utils.ts` - 工具函数
3. `src/renderer/src/lib/backlink/BacklinkIndex.ts` - 主实现

## 性能考虑

1. **防抖 500ms**: 合并频繁编辑操作，避免频繁重建索引
2. **增量更新**: 只更新变化的 Card
3. **Potential Links 防抖更长**: 模糊搜索开销大，可以考虑 1000ms
4. **懒计算**: getBacklinks/getPotentialLinks 返回 Accessor，只在访问时计算

## 确认事项

已确认：
- [x] Potential Links 使用模糊匹配
- [x] 防抖时间较长（500ms+）
- [x] 显示引用上下文，高亮匹配块
- [x] 匹配块后面缩进的所有块都显示
- [x] BacklinkIndex 作为独立模块，通过 init 注入 objCache
- [x] 在 AppStore 中组装

准备开始实现？
