## 代码风格

- 除非我要求，不要写注释
- 偏好紧凑的代码风格，比如如果花括号里只有一行，直接省略花括号
- 偏好 type，除非需要声明合并，不要使用 interface
- 尽量做到松散耦合。比如模块 @renderer/src/lib/storage：
  - storage.ts 下定义接口（用 type 定义）
  - mock.ts 下给出 mock 实现
  - sqlite.ts 下给出 SQLite 实现
  - 所有实现都使用无参构造函数实例化，然后使用 init 初始化（也就是说接口定义中一定要有 init，如果需要初始化）
  - 这样每个模块都是容易组合，容易测试的
- 如果看到一个组件上有仅用于标识的，非 tailwindcss 类名，一定注意是否在 style 块和 css 中用到了这个类名

## 其他要求

- 每次修改代码后，都运行 typecheck 确保没有类型错误
- 始终使用 pnpm 作为包管理器

## 关于 Electron main 和 renderer 进程间通信

这是一个 electron 项目，而不是一般的前端项目，因此始终记住 main 和 renderer 进程之间存在上下文隔离，在 renderer 进程访问 nodejs 的 api 是不会成功的。下面是正确的在 main 和 renderer 之间通信需要做的事情：

1. 在 src/main/index.ts 中 `app.whenReady()` 回调用里用 ipcMain.on / ipcMain.handle 注册 IPC 方法，注意使用 restFunc 剥离第一个参数可以让代码更简单
2. 在 src/preload/preload.d.ts 中使用声明合并拓展 window.api 的类型，注意为了保持 preload.d.ts 尽可能干净，所有类型都放到 src/preload/index.ts 里
3. 在 src/preload/index.ts 里拓展 api 对象，务必在此处显式定义并导出 API 接口类型（如 `QuickAPI`），然后在 preload.d.ts 中复用该类型，保持 Single Source of Truth。
4. 在 renderer 进程中使用 window.api.xxx 调用注册的 IPC 方法

## 项目结构

- docs
- src
  - main：各种 ipc 函数都定义在这边，注意不要引入类、接口、复杂的类型之类的东西，在这边就只需要写一个个的 ipc 函数就好，类型就定义在函数签名里
  - preload：通过 contextBridge 暴露 main 中的 ipc 方法给 renderer。另外，如果有 main 和 renderer 都要使用的东西，比如类型 / 工具函数等，也都定义在 preload 里面
  - renderer
    - src
      - assets：图标、css 等资源文件放到这里。
      - ui：与渲染相关的代码，较重的纯数据逻辑都不要放到这里，而应该放到 lib 里
        - common：通用 UI 组件
        - main-window：主窗口相关视图（CardEditor, AllCardsView, SettingsPanel 等）
        - mini-window：迷你窗口相关视图
        - quick-window：快速记录窗口相关视图
        - search-window：搜索窗口相关视图
        - solidui：来自 solid-ui 的 shadcn 风格组件，官网 https://www.solid-ui.com，总是考虑优先使用这里的组件。
      - icons：自定义图标，如果 lucide-solid 中没有想要的图标，才会手工生成放到这里。
      - lib：与渲染无关的逻辑，尽量不要出现任何来自 ui 框架的和渲染相关的东西（除了 Signal）
        - backlink：双向链接索引与管理
        - common：公共工具函数与类型
          - utils：工具函数 (datetime, fuzzySearch 等)
          - types：通用类型
        - editor：编辑器核心逻辑 (TiptapEditor) 与扩展 (extensions)
        - objcache：对象缓存层，向上提供响应式读取方法和事务化的修改方法
        - settings：设置管理 (SettingsStore)
        - state：应用状态管理 (AppStore)
        - storage：存储层，只负责读写对象，不负责缓存
          - storage.ts：存储层接口
          - mock.ts：mock 实现
          - sqlite.ts：SQLite 实现
        - textcontent：文本内容缓存与提取

现在 UI 非常不规范，很多颜色等变量都是硬编码的，因为是直接参考设计师出图写的 UI，效果很好看，但组件可能难以复用。请暂时维持现状，不要尝试抽取 / 复用，如果你认为抽取 / 复用可行，请先询问我的意见。

## 设置存储

- 使用 `storage.getSetting(key)` 和 `storage.setSetting(key, value)` 读写
- Value 仅支持字符串，对象需手动 JSON 序列化
- 数据存储在 SQLite 数据库中，随库迁移（适用于项目级配置）

## 状态管理

- 主窗口 (Main Window): 使用 `@renderer/lib/state/AppStore.ts` (`appStore`)
  - 包含完整逻辑：SQLite 存储、对象缓存 (ObjCache)、反向链接索引、文本缓存等。
  - 管理所有响应式状态 (Signals)。
  - 严禁在辅助窗口中使用，防止数据库锁冲突和资源浪费。

- 辅助窗口 (Quick/Search/Mini): 使用 `@renderer/lib/state/AppStoreIpc.ts` (`appStoreIpc`)
  - 轻量级 IPC 代理，实现 `AppStoreInterface` 接口。
  - 通过 `window.api` 委托主进程或主窗口执行操作。
  - 不维护本地状态，仅负责数据传输。

## 状态与索引架构

- ObjCache (核心)
  - 基于 SolidJS Signals 实现的响应式对象缓存。
  - 事务化操作：所有修改通过 `withTx` 进行，支持回滚。
  - 事件发布：事务提交后 (`committed`)，同步更新 Signal 并同步触发 `subscribe` 回调。

- 索引 (BacklinkIndex / TextContentCache)
  - 订阅 `ObjCache` 的事件更新。
  - 防抖更新：收到事件后，将变更 ID 加入 `pendingUpdates` 集合，并启动防抖定时器 (BacklinkIndex: 500ms, TextContentCache: 100ms)。
  - 更新策略差异：
    - BacklinkIndex (即时性较低)：防抖结束后，主动重新计算并更新受影响的索引（反向链接、潜在链接），触发 Signal 更新。
    - TextContentCache (惰性求值)：防抖结束后，仅标记脏数据 (`dirty.add`) 并清理旧缓存，不立即计算。只有当 UI 访问 `getText()`/`getTitle()` 时，才重新计算最新值。

## 新增窗口指南

- Renderer: 在 src/renderer 根目录新建 html 文件，指向 src/renderer/src 下的新 tsx 入口
- Build: 在 electron.vite.config.ts 的 rollupOptions.input 中注册新 html
- Main: 在 src/main/index.ts 中添加 createXxxWindow 函数
  - 开发环境 loadURL: process.env["ELECTRON_RENDERER_URL"]/xxx.html
  - 生产环境 loadFile: join(__dirname, "../renderer/xxx.html")
- IPC: 注册相关 IPC 通信


