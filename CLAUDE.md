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

## 其他要求

- 每次修改代码后，都运行 typecheck 确保没有类型错误
- 始终使用 pnpm 作为包管理器

## 关于 Electron main 和 renderer 进程间通信

这是一个 electron 项目，而不是一般的前端项目，因此始终记住 main 和 renderer 进程之间存在上下文隔离，在 renderer 进程访问 nodejs 的 api 是不会成功的。下面是正确的在 main 和 renderer 之间通信需要做的事情：

1. 在 src/main/index.ts 中 `app.whenReady()` 回调用里用 ipcMain.on / ipcMain.handle 注册 IPC 方法，注意使用 restFunc 剥离第一个参数可以让代码更简单
2. 在 src/preload/preload.d.ts 中使用声明合并拓展 window.api 的类型，注意为了保持 preload.d.ts 尽可能干净，所有类型都放到 src/preload/index.ts 里
3. 在 src/preload/index.ts 里拓展 api 对象
4. 在 renderer 进程中使用 window.api.xxx 调用注册的 IPC 方法

## 项目结构

- docs
- src
  - main：各种 ipc 函数都定义在这边，注意不要引入类、接口、复杂的类型之类的东西，在这边就只需要写一个个的 ipc 函数就好，类型就定义在函数签名里
  - preload：通过 contextBridge 暴露 main 中的 ipc 方法给 renderer。另外，如果有 main 和 renderer 都要使用的东西，比如类型 / 工具函数等，也都定义在 preload 里面
  - renderer
    - src
      - assets：图标、css 等资源文件放到这里。
      - ui：与渲染相关的代码，较重的纯数据逻辑都不要放到这里，而应该放到 lib 里，之后切换 ui 框架会比较方便
        - solidui：来自 solid-ui 的 shadcn 风格组件，官网 https://www.solid-ui.com，总是考虑优先使用这里的组件。如果没有想要的组件，先询问我，我会到 solidui 官网帮你看看是否有现成可用的实现，如果确实没有，我会告诉你，你才能开始手工实现。
        - 其他文件：各种视图都放到这里，不需要严格一个文件一个组件，更好的做法是一个视图一个组件。如果一个文件中某个组件需要复用，才考虑单独提出到一个文件中。
      - icons：自定义图标，如果 lucide-solid 中没有想要的图标，才会手工生成放到这里。
      - lib：与渲染无关的逻辑，尽量不要出现任何来自 ui 框架的和渲染相关的东西，但也有特例：比如 solidjs 的响应式系统（Signal）和 vue 的响应式系统（ref、reactive）如果需要也可以放到这里，比如可能需要维护一个 `reactiveNotes: Map<BlockId, { signal: Signal<Note | null>; dispose: () => void; refCound: number; }>` 这种东西。
        - common：一些公共的东西，如果需要被很多地方使用考虑放到这里
          - utils：一些工具函数
            - datetime.ts
            - tailwindcss.ts
            - zod.ts
          - types：需要被很多地方使用的类型，不是所有类型都放到这里，比如组件 Props 这种应该和组件放在一起
        - storage：存储层，只负责读写对象，不负责缓存！
          - storage.ts：存储层接口
          - mock.ts：mock 实现，用于测试
          - sqlite.ts：SQLite 实现
        - objcache：缓存层，向上提供响应式读取方法和事务化的修改方法
        - mock：存放 mock 数据 / 逻辑的地方

现在 UI 非常不规范，很多颜色等变量都是硬编码的，因为是直接参考设计师出图写的 UI，效果很好看，但组件可能难以复用。请暂时维持现状，不要尝试抽取 / 复用，如果你认为抽取 / 复用可行，请先询问我的意见。
