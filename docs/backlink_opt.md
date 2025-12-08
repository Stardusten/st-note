# 反链面板优化方案

## 目标效果

```
backlink panel for [[aaa]]

原文档结构:
- something
  - one more level
    - one more level
      - link to [[aaa]]
      - ccc
      - ddd
  - link to [[bbb]]
- another thing
- yet another thing

期望显示效果:

/ something / ... / one more level
- link to [[aaa]]
...2 more blocks

/ something / one more level
- one more level
  - link to [[aaa]]
  ...2 more blocks
```

核心需求:
1. 显示面包屑路径（从根到反链所在块的路径）
2. 只展开反链所在的**直接父块**及其子块
3. 其他兄弟块折叠显示 "...N more blocks"

---

## 方案 A：纯 Decoration 方案

### 思路
不改变文档结构，只用 ProseMirror Decoration（node decoration + widget decoration）控制显示/隐藏。

### 实现
- 用 `Decoration.node` 添加 `backlink-hidden` 类隐藏非反链块
- 用 `Decoration.widget` 在隐藏块后插入折叠指示器
- 面包屑也用 widget 在反链块前插入

### 优点
- 实现相对简单
- 不改变文档结构
- 保持编辑功能

### 缺点
- 面包屑路径难以实现（需要在隐藏的祖先块前插入 widget，但祖先块内容如何获取？）
- 隐藏的块仍然占据 DOM 空间，只是 `display: none`
- 难以实现"部分展开"的效果（只显示某个层级的某些块）
- 性能问题：大文档时仍然渲染所有节点

---

## 方案 B：虚拟渲染方案

### 思路
不直接渲染原文档，而是构建一个"视图文档"，只包含需要显示的内容。

### 数据结构
```typescript
type BacklinkView = {
  breadcrumb: string[]           // ["something", "...", "one more level"]
  block: PMNode                  // 包含反链的块
  hiddenSiblingsCount: number    // 2 more blocks
}

function buildBacklinkViews(doc: PMNode, targetCardId: string): BacklinkView[]
```

### 实现步骤
1. 找到所有包含目标 cardRef 的**最内层块**
2. 对每个反链块，向上遍历构建面包屑路径
3. 相邻的反链块合并（如果它们共享同一个父块）
4. 渲染时：
   - 渲染面包屑（纯 UI 组件，如 `<div class="breadcrumb">/ something / ... / one more level</div>`）
   - 只渲染反链块及其子块（创建一个只包含这个块的迷你文档）
   - 渲染 "...N more blocks" 指示器

### 优点
- 完全控制渲染内容
- 面包屑容易实现
- 性能更好（不渲染不需要的内容）
- 视觉效果最接近设计目标

### 缺点
- 需要为每个反链块创建独立的 EditorView（或只读渲染）
- 编辑功能复杂（需要将编辑同步回原文档）
- 架构改动较大
- 多个 EditorView 的状态同步问题

---

## 方案 C：混合方案（推荐）

### 思路
保持单个 EditorView，但用更复杂的 Decoration 策略实现面包屑和折叠效果。

### 数据结构
```typescript
type BlockVisibility = {
  pos: number
  visible: boolean
  breadcrumb?: string[]  // 只有反链块的第一个显示面包屑
  isFirstInGroup: boolean  // 是否是一组反链的第一个
  hiddenCountAfter: number  // 该块后面有多少隐藏块
}

function analyzeBlockVisibility(doc: PMNode, targetCardId: string): BlockVisibility[]
```

### 实现步骤

#### 1. 分析阶段
```typescript
function analyzeDocument(doc: PMNode, targetCardId: string) {
  // 1. 找到所有 cardRef 位置
  const cardRefPositions: number[] = []
  doc.descendants((node, pos) => {
    if (node.type === schema.nodes.cardRef && node.attrs.cardId === targetCardId) {
      cardRefPositions.push(pos)
    }
  })

  // 2. 对每个 cardRef，找到其所在的最内层块及所有祖先块
  const visibleBlocks = new Map<number, { breadcrumb: string[], depth: number }>()

  for (const refPos of cardRefPositions) {
    const $pos = doc.resolve(refPos)
    const breadcrumb: string[] = []

    for (let d = 1; d <= $pos.depth; d++) {
      const node = $pos.node(d)
      if (node.type === schema.nodes.block) {
        const blockPos = $pos.before(d)
        const title = extractFirstLineText(node) || "..."
        breadcrumb.push(title)

        if (!visibleBlocks.has(blockPos)) {
          visibleBlocks.set(blockPos, { breadcrumb: [...breadcrumb], depth: d })
        }
      }
    }
  }

  return visibleBlocks
}
```

#### 2. Decoration 生成阶段
```typescript
function createDecorations(doc: PMNode, visibleBlocks: Map<number, BlockInfo>) {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type !== schema.nodes.block) return

    const blockInfo = visibleBlocks.get(pos)

    if (blockInfo) {
      // 可见块：可能需要添加面包屑
      if (blockInfo.isFirstInGroup && blockInfo.breadcrumb.length > 1) {
        decorations.push(
          Decoration.widget(pos, () => createBreadcrumbElement(blockInfo.breadcrumb))
        )
      }
    } else {
      // 隐藏块
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, { class: "backlink-hidden" })
      )
    }
  })

  // 添加折叠指示器...

  return DecorationSet.create(doc, decorations)
}
```

#### 3. 面包屑渲染
```typescript
function createBreadcrumbElement(breadcrumb: string[]): HTMLElement {
  const el = document.createElement("div")
  el.className = "backlink-breadcrumb"

  // 如果路径太长，中间用 ... 省略
  const displayPath = breadcrumb.length > 3
    ? [breadcrumb[0], "...", breadcrumb[breadcrumb.length - 1]]
    : breadcrumb

  el.textContent = "/ " + displayPath.join(" / ")
  return el
}
```

### 优点
- 不需要改变现有的编辑器架构
- 可以保持编辑功能
- 面包屑可以通过 widget decoration 实现
- 单个 EditorView，状态管理简单

### 缺点
- Decoration 逻辑较复杂
- 隐藏块仍然在 DOM 中（性能影响）
- 面包屑和块内容的视觉分离需要仔细的 CSS 设计

### 难点
- 面包屑需要访问被隐藏的祖先块的内容
- 需要正确处理多个反链在同一父块下的情况
- 折叠指示器的位置计算

---

## 实现建议

### 推荐方案
**方案 C（混合方案）**

### 实现优先级
1. **Phase 1**：基本的折叠/展开
   - 只显示包含反链的块及其子块
   - 隐藏其他块
   - 显示折叠指示器 "...N hidden blocks"

2. **Phase 2**：面包屑显示
   - 在每组反链块前显示面包屑路径
   - 路径过长时省略中间部分

3. **Phase 3**：优化和完善
   - 折叠指示器的位置优化
   - 面包屑可点击跳转
   - 性能优化（大文档）

---

## CSS 参考

```css
.backlink-hidden {
  display: none;
}

.backlink-breadcrumb {
  color: rgb(100, 100, 100);
  font-size: 12px;
  padding: 4px 0;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.backlink-collapsed-indicator {
  color: rgb(100, 100, 100);
  font-size: 12px;
  padding: 4px 0;
  cursor: default;
}

.backlink-highlight {
  background-color: rgba(234, 179, 8, 0.2);
}
```
