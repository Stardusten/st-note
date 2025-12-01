function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"))
    }, timeout)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 任务的元数据，用于描述任务的属性
type TaskMeta = {
  description?: string
  [key: string]: any
}

// 任务的 callback 在执行时，会作为参数传入的一些信息
// 用于让 callback 在执行时感知其被执行的上下文
type TaskAwareness = {
  /** 被当前任务合并掉的旧任务（仅当 options.key 相同且旧任务尚未执行时存在） */
  mergedTasks: AsyncTask[]
}

type AsyncTask = {
  /** 任务的唯一标识 */
  id: number
  /** 任务的执行函数 */
  callback: (awareness: TaskAwareness) => void | Promise<void>
  /**
   * 任务的检查函数，如果返回 false，则任务会被跳过
   * 因为一个任务很可能会被已有任务阻塞，因此有时需要检查任务得到处理机时是否仍然需要执行
   */
  condition?: () => boolean
  /**
   * 任务键：如果提供，相同 key 的未执行任务会被替换成最后一次提交的任务
   * （即 debounce 行为），未提供则不会自动合并
   */
  key?: string
  /** 任务的取消函数 */
  canceller?: () => void
  /** 记录这是否是一个递归任务，防止递归中内部任务阻塞外部任务 */
  recursive?: boolean
  /** 任务的超时时间，单位为毫秒 */
  timeout?: number
  /** 任务的元数据 */
  meta?: TaskMeta
  /** 任务的上下文信息 */
  awareness: TaskAwareness
}

export type TaskOptions = {
  /**
   * 相同 key 的未执行任务会被替换，只保留最新提交的那一个。
   * 如果不需要合并行为，则不要提供 key。
   */
  key?: string
  /** 延迟毫秒数，默认为 0 立即入队执行 */
  delay?: number
  /** 检查函数，返回 false 则跳过本次任务 */
  condition?: () => boolean
  /** 单个任务超时毫秒数，若未指定则使用队列默认 */
  timeout?: number
  meta?: TaskMeta
}

export class AsyncTaskQueue {
  private id: number = 0
  private queue: AsyncTask[] = []
  private giveupQueue: number[] = []
  private ongoingTask: AsyncTask | null = null
  private defaultTimeout: number

  /**
   * @param defaultTimeout_ 任务的默认超时时间，单位为毫秒，默认为 2000ms
   */
  constructor(defaultTimeout_: number = 2000) {
    this.defaultTimeout = defaultTimeout_
  }

  /**
   * 向队列添加异步任务
   * @param callback 任务函数，支持返回 Promise
   * @param options  任务选项
   */
  queueTask(
    callback: (awareness: TaskAwareness) => void | Promise<void>,
    options: TaskOptions = {}
  ) {
    const { key, delay, condition, timeout, meta } = options
    const id = this.id++
    // console.log("add task", id);
    // 如果提供 key，则查找队列中是否存在相同 key 的未执行任务（防抖合并）
    let mergedTasks: AsyncTask[] = []
    if (key && key != "null") {
      const idx = this.queue.findIndex((item) => item.key == key)
      if (idx !== -1) {
        const task = this.queue[idx]!
        task.canceller && task.canceller()
        this.queue.splice(idx, 1)
        mergedTasks.push(...task.awareness.mergedTasks)
        mergedTasks.push(task)
      }
    }
    // detect recursion
    const n = new Error().stack?.split("\n").filter((l) => l.includes("enqueue")).length ?? 0
    const recursive = n > 1
    const index = this.ongoingTask
      ? this.queue.findIndex((task) => task.id == this.ongoingTask!.id)
      : -1
    if (delay && delay > 0) {
      const handler = setTimeout(async () => {
        this._processQueue(id)
      }, delay)
      const canceller = () => {
        clearTimeout(handler)
      }
      if (recursive) {
        this.queue.splice(index + 1, 0, {
          id,
          callback,
          key: key ?? "null",
          canceller,
          recursive: true,
          condition,
          timeout,
          meta,
          awareness: { mergedTasks }
        })
      } else {
        this.queue.push({
          id,
          callback,
          key: key ?? "null",
          canceller,
          timeout,
          condition,
          meta,
          awareness: { mergedTasks }
        })
      }
    } else {
      if (recursive) {
        this.queue.splice(index + 1, 0, {
          id,
          callback,
          key: key ?? "null",
          recursive: true,
          condition,
          timeout,
          meta,
          awareness: { mergedTasks }
        })
      } else {
        this.queue.push({
          id,
          callback,
          key: key ?? "null",
          condition,
          timeout,
          meta,
          awareness: { mergedTasks }
        })
      }
      this._processQueue(id)
    }
  }

  /**
   * 向队列添加任务并等待执行完毕
   * @param callback 任务函数，支持返回 Promise
   * @param options  任务选项
   * @returns 任务的 Promise
   */
  async queueTaskAndWait(
    callback: (awareness: TaskAwareness) => void | Promise<void>,
    options: {
      key?: string
      delay?: number
      condition?: () => boolean
      timeout?: number
      description?: string
    } = {}
  ) {
    return new Promise((resolve) => {
      const wrappedTask = async (awareness: TaskAwareness) => {
        await callback(awareness)
        resolve(undefined)
      }

      this.queueTask(wrappedTask, options)
    })
  }

  /**
   * 刷新队列，确保队列中的任务立即执行
   */
  async flush() {
    // 先取消所有延迟任务的定时器，确保它们可以立即被执行
    for (const task of this.queue) {
      task.canceller?.()
    }

    // 如果当前没有正在执行的任务，则主动启动队列处理
    if (this.queue.length > 0 && !this.ongoingTask) {
      await this._processQueue(this.queue[0]!.id)
    }

    // 等待队列完全清空（包括递归任务）
    while (this.queue.length > 0 || this.ongoingTask) {
      await timeout(0)
    }
  }

  /** @deprecated 请使用 flush */
  flushQueue = this.flush.bind(this)

  async _processQueue(targetId: number) {
    if (this.queue.length === 0) {
      return
    }

    if (this.ongoingTask) {
      if (!this.queue[0]!.recursive) {
        this.giveupQueue.push(targetId)
        return
      }
    }

    const task = this.queue.shift()!
    const { id, callback, canceller, recursive, condition, timeout, meta, awareness } = task

    this.ongoingTask = task

    canceller && canceller()
    if (!condition || condition()) {
      try {
        const maybePromise = callback(awareness)
        if (maybePromise != null) {
          // is promise
          try {
            await withTimeout(maybePromise as any, timeout ?? this.defaultTimeout) // TODO avoid hardcoding
          } catch (error) {
            console.warn(error)
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    this.ongoingTask = null

    if (id !== targetId) {
      await this._processQueue(targetId)
    }

    // task targetId should be finished here
    if (!recursive && this.giveupQueue.length > 0) {
      queueMicrotask(() => {
        for (const id of this.giveupQueue) {
          const targetId = this.giveupQueue.shift()
          targetId && this._processQueue(id)
        }
      })
    }
  }
}

// function assert(condition: boolean, message: string) {
//   if (!condition) {
//     console.error("❌ 断言失败:", message);
//     throw new Error(message);
//   } else {
//     console.log("✅", message);
//   }
// }

// async function testSerialExecution() {
//   console.log("\n=== testSerialExecution ===");
//   const queue = new AsyncTaskQueue();
//   const order: number[] = [];

//   queue.queueTask(() => {
//     order.push(1);
//   });
//   queue.queueTask(() => {
//     order.push(2);
//   });
//   queue.queueTask(() => {
//     order.push(3);
//   });

//   await queue.flush();
//   assert(order.join(",") === "1,2,3", "任务应按 FIFO 顺序执行");
// }

// async function testDelay() {
//   console.log("\n=== testDelay ===");
//   const queue = new AsyncTaskQueue();
//   const diff: number[] = [];
//   const start = Date.now();

//   queue.queueTask(
//     async () => {
//       diff.push(Date.now() - start);
//     },
//     { delay: 50 }
//   );
//   queue.queueTask(
//     async () => {
//       diff.push(Date.now() - start);
//     },
//     { delay: 100 }
//   );

//   await timeout(1000);
//   assert(diff[0]! >= 45, "第一条任务应延迟约 50 ms");
//   assert(diff[1]! >= 95, "第二条任务应延迟约 100 ms");
// }

// async function testDebounce() {
//   console.log("\n=== testDebounce ===");
//   const queue = new AsyncTaskQueue();
//   const result: number[] = [];

//   // 第一条：随后会被合并掉
//   queue.queueTask(
//     ({ mergedTasks }) => {
//       result.push(1);
//       assert(mergedTasks.length === 0, "首条任务 mergedTasks 应为空");
//     },
//     { key: "A", delay: 100 }
//   );

//   // 第二条：应覆盖上一条
//   queue.queueTask(
//     ({ mergedTasks }) => {
//       result.push(2);
//       assert(mergedTasks.length === 1, "应当收到 1 条被合并任务");
//     },
//     { key: "A", delay: 100 }
//   );

//   await timeout(1000);
//   assert(result.join(",") === "2", "只有最后一个去抖任务被执行");
// }

// async function testRecursive() {
//   console.log("\n=== testRecursive ===");
//   const queue = new AsyncTaskQueue();
//   const order: number[] = [];

//   queue.queueTask(() => {
//     order.push(1);
//     // 任务内部递归再添加一条
//     queue.queueTask(() => {
//       order.push(2);
//     });
//   });

//   await queue.flush();
//   assert(order.join(",") === "1,2", "递归添加的任务应在外层任务之后执行");
// }

// async function testFlush() {
//   console.log("\n=== testFlush ===");
//   const queue = new AsyncTaskQueue();
//   const order: number[] = [];

//   queue.queueTask(
//     async () => {
//       order.push(1);
//     },
//     { delay: 1000 }
//   );

//   await queue.flush();
//   assert(order.join(",") === "1", "flush() 会让队列中的任务立即执行");
// }

// async function runTests() {
//   await testSerialExecution();
//   await testDelay();
//   await testDebounce();
//   await testRecursive();
//   await testFlush();
// }

// runTests();
