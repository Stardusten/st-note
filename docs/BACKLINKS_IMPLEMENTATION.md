# Backlinks 实现文档

## 概述

本文档描述了 st-note 中 Backlinks 功能的完整实现，包括从索引构建、缓存管理、到反链面板编辑器的全流程。

## 架构层次

### 1. 索引层 (BacklinkIndex)

**位置**: `src/renderer/src/lib/backlink/`

#### 核心概念

- **正向索引** (`forwardIndex`): `Map<refId, Set<sourceCardIds>>` - 某个 Card 被哪些 Card 引用
- **缓存机制** (`backlinkCache`, `potentialLinkCache`): 缓存计算结果，避免重复计算
- **防抖更新**: 500ms 防抖合并频繁的编辑操作

#### 事件驱动更新

```typescript
// ObjCache 事务提交时发出事件
ObjCache.emit({ type: 'committed', source?: string, ops: [...] })

// BacklinkIndex 订阅事件
objCache.subscribe((event) => {
  // 标记待更新的 Card ID
  for (const op of event.ops) {
    if (op.object?.type === 'card') {
      this.pendingUpdates.add(op.id)
    }
  }
  // 防抖后更新索引和清空缓存
  this.scheduleUpdate()
})
```

#### 响应式暴露

```typescript
getBacklinks(cardId): Accessor<BacklinkContext[]>
getPotentialLinks(cardId, title): Accessor<BacklinkContext[]>
```

返回 Signal 包装的 Accessor，UI 可以响应式地使用。

### 2. Transaction Source 机制

**目的**: 区分事务来源，让编辑器忽略自己触发的更新

#### 事务流程

```typescript
// 1. 客户端代码发起更新，附带 source
await appStore.updateCard(cardId, content, text, 'backlink-editor:card-123')

// 2. AppStore 转发 source 到事务
await objCache.withTx(tx => {
  if (source) tx.setSource(source)
  tx.update(...)
})

// 3. 事务提交时，source 被包含在事件中
emit({ type: 'committed', source: tx.source, ops: [...] })

// 4. 订阅者检查 source
if (event.source === myEditorId) return  // 忽略自己的更新
```

#### 实现细节

**ObjCache 类型定义**:
```typescript
export type ObjCacheEvent = {
  type: 'committed'
  source?: string  // 事务来源标记
  ops: ObjCacheEventOp[]
}

export type TxObj = {
  setSource: (source: string) => void  // 新增方法
  // ... 其他方法
}
```

**AppStore 支持**:
```typescript
async updateCard(id: StObjectId, content: any, text: string, source?: string) {
  await objCache.withTx(tx => {
    if (source) tx.setSource(source)
    tx.update(...)
  })
}

subscribeToUpdates(listener: (event: ObjCacheEvent) => void): () => void {
  return objCache.subscribe(listener)
}
```

### 3. 反链面板编辑器

**位置**: `src/renderer/src/ui/main-window/`

#### CardBacklinkEditor 组件

```typescript
// 为每个编辑器生成唯一 ID
const editorId = `backlink-editor:${props.cardId}`

// 编辑时附带 source
const handleUpdate = (content: any, text: string) => {
  appStore.updateCard(props.cardId, content, text, editorId)
}
```

#### BacklinkTiptapEditor 组件

```typescript
onMount(() => {
  // ... 编辑器初始化 ...

  // 订阅更新，忽略自己的更新
  const unsubscribe = appStore.subscribeToUpdates((event) => {
    if (event.source === props.editorId) return  // 关键！

    // 处理来自其他编辑器的更新
    for (const op of event.ops) {
      if (op.op === 'update' && op.id === myCardId) {
        editor.commands.setContent(newContent)
      }
    }
  })
})
```

### 4. Keyed List 渲染

**目的**: 保持 backlink 卡片的组件实例稳定，避免不必要的重建

#### 使用 `@solid-primitives/keyed`

```tsx
import { Key } from "@solid-primitives/keyed"

<Key each={pagedBacklinks()} by={backlink => backlink.sourceCardId}>
  {(backlink) => (
    <CardBacklinkEditor
      cardId={backlink().sourceCardId}
      blocks={backlink().blocks}
      ...
    />
  )}
</Key>
```

#### 工作原理

| 操作 | 默认 `For` | `Key` 组件 |
|------|----------|----------|
| 数组项新增 | 创建新组件 | 创建新组件 |
| 数组项删除 | 删除组件 | 删除组件 |
| 数组项值变化 | 重建组件 | 更新值，**不重建组件** |
| 数组项顺序变化 | 重建所有组件 | 根据 key 重新排序，**不重建** |

#### 对比

**不使用 Key（原始 For）**:
```
编辑 backlink A → updateCard(A) → 索引更新 → getBacklinks() 返回新数组
→ For 检测数组引用变化 → 重建所有组件 → 编辑器失焦
```

**使用 Key + Source**:
```
编辑 backlink A → updateCard(A, source='backlink-editor:A')
→ 索引更新 → getBacklinks() 返回新数组但 key 不变
→ Key 复用组件 A → BacklinkTiptapEditor 检查 source，忽略自己的更新
→ 编辑器保持焦点
```

## 完整数据流

```
用户在 backlink 编辑器中编辑
    ↓
CardBacklinkEditor.handleUpdate()
    ↓
appStore.updateCard(cardId, content, text, editorId='backlink-editor:xxx')
    ↓
ObjCache.withTx(tx => {
  tx.setSource('backlink-editor:xxx')
  tx.update(...)
})
    ↓
ObjCache.emit({ type: 'committed', source: 'backlink-editor:xxx', ops: [...] })
    ↓
BacklinkIndex.handleEvent()
  → pendingUpdates.add(cardId)
  → 500ms 后 processPendingUpdates()
  → backlinkCache.clear()
  → indexVersion++
    ↓
UI 组件 createEffect/Signal 响应
    ↓
appStore.getBacklinks(currentCardId) → 返回新数组（但 key 不变）
    ↓
Key 组件检测 key 是否变化
  → key 不变: 复用组件实例
  → props（blocks）值变化：传给子组件
    ↓
BacklinkTiptapEditor 收到 props 变化
  → subscribeToUpdates 收到事件
  → 检查 event.source === myEditorId
  → 是: 忽略（这是我的更新）
  → 否: 更新编辑器内容
    ↓
编辑器保持焦点，只更新数值
```

## 关键设计决策

### 1. 防抖延迟 (500ms)

**原因**:
- 避免频繁的索引重建
- 合并连续的编辑操作
- 减少 Signal 更新频率

**权衡**:
- 延迟: backlinks 反应不是实时的
- 性能: 避免频繁重新计算

### 2. 缓存而非响应式计算

**原因**:
```typescript
// 不好的做法：每次都访问 Signal
getBacklinks(cardId): Accessor<BacklinkContext[]> {
  return () => {
    const sourceCardIds = this.forwardIndex.get(cardId)
    for (const sourceId of sourceCardIds) {
      const obj = this.objCache.get(sourceId)()  // ← 创建响应式依赖
      // ...
    }
  }
}
```

这样会导致任何 card 更新都触发重新计算。

**解决**:
```typescript
// 只在索引变化时清空缓存，否则返回缓存结果
getBacklinks(cardId): Accessor<BacklinkContext[]> {
  return () => {
    this.indexVersion()  // 只依赖这一个 Signal

    let cached = this.backlinkCache.get(cardId)
    if (!cached) {
      cached = this.computeBacklinks(cardId)
      this.backlinkCache.set(cardId, cached)
    }
    return cached
  }
}
```

### 3. Source 字符串格式

```
'backlink-editor:card-id'
```

**优点**:
- 易于识别来源类型（backlink-editor / main-editor / search-editor）
- 包含相关 ID，便于调试
- 可扩展性强

## 性能优化总结

| 优化点 | 技术 | 效果 |
|------|------|------|
| 避免索引频繁更新 | 防抖 500ms | 减少计算 |
| 避免不必要的计算 | 缓存 + Signal 分离 | 只在真正需要时计算 |
| 避免编辑器失焦 | Key + Source | 编辑器实例复用 |
| 避免大量编辑器实例 | 分页 (10 per page) | 内存和渲染优化 |

## 可能的改进方向

1. **持久化缓存**: 当 backlinks 很多时，可以考虑只加载当前页的数据
2. **增量索引**: 当项目很大时，可以考虑使用增量更新而不是完全重建
3. **Collaborative 支持**: Source 机制天然支持多用户编辑识别
4. **搜索优化**: Potential Links 的模糊搜索可以添加缓存和分页
