import { AsyncTaskQueue } from "@renderer/lib/common/taskQueue"
import { Accessor, createRoot, createSignal, Signal } from "solid-js"
import { CreateParams, StObject, UpdateParams } from "../common/types"
import { StObjectId } from "src/preload"
import type { Storage } from "../storage/storage"

export type TxOpParams =
  | { type: "create"; newObject: CreateParams }
  | { type: "update"; id: StObjectId; patch: UpdateParams }
  | { type: "delete"; id: StObjectId }

export type ExecutedTxOp =
  | { type: "create"; object: StObject }
  | { type: "update"; newObject: StObject; oldObject: StObject }
  | { type: "delete"; deletedObject: StObject }

export type TxStatus = "notCommit" | "pending" | "committed" | "rollbacked" | "aborted"

export type TxObj = {
  getStatus: () => TxStatus
  create: (item: CreateParams) => void
  update: (id: StObjectId, patch: UpdateParams) => void
  delete: (id: StObjectId) => void
  abort: () => void
}

export class ObjCache {
  cache: Map<StObjectId, Signal<StObject | null>> = new Map()
  txQueue: AsyncTaskQueue = new AsyncTaskQueue()
  storage: Storage | null = null

  async init(storage: Storage) {
    this.storage = storage

    const allObjects = await storage.query()

    createRoot(() => {
      for (const obj of allObjects) {
        const signal = createSignal<StObject | null>(obj)
        this.cache.set(obj.id, signal)
      }
    })
  }

  private getStorage(): Storage {
    if (!this.storage) {
      throw new Error("Storage not initialized")
    }
    return this.storage
  }

  get(id: StObjectId): Accessor<StObject | null> {
    let signal = this.cache.get(id)
    if (!signal) {
      signal = createRoot(() => createSignal<StObject | null>(null))
      this.cache.set(id, signal)
    }
    return signal[0]
  }

  async withTx(f: (tx: TxObj) => void | Promise<void>) {
    const txObj = new TxObjImpl()
    await this.txQueue.queueTaskAndWait(async () => {
      try {
        await f(txObj)
        if (txObj.status == "aborted") {
          console.warn("tx aborted, no need to commit")
          return
        }
        await this.commit(txObj)
      } catch (error) {
        await this.rollback(txObj)
        throw error
      }
    })
  }

  private async rollback(tx: TxObjImpl) {
    if (tx.status !== "pending") return
    const storage = this.getStorage()
    const executedOps = tx.executedOps || []
    for (let i = executedOps.length - 1; i >= 0; i--) {
      const op = executedOps[i]
      try {
        switch (op.type) {
          case "create": {
            await storage.delete(op.object.id)

            const signal = this.cache.get(op.object.id)
            if (signal) signal[1](null)

            break
          }
          case "update": {
            const { id, type, data, text, tags } = op.oldObject
            await storage.update({ id, type, data, text, tags })

            const signal = this.cache.get(op.oldObject.id)
            if (signal) signal[1](op.oldObject)

            break
          }
          case "delete": {
            const { id, type, data, text, tags } = op.deletedObject
            await storage.update({ id, type, data, text, tags })

            let signal = this.cache.get(op.deletedObject.id)
            if (!signal) {
              signal = createRoot(() => createSignal<StObject | null>(op.deletedObject))
              this.cache.set(op.deletedObject.id, signal)
            } else {
              signal[1](op.deletedObject)
            }

            break
          }
        }
      } catch (rollbackError) {
        console.error("Failed to rollback operation", op, rollbackError)
      }
    }
    tx.status = "rollbacked"
  }

  private async commit(tx: TxObjImpl) {
    if (tx.status !== "notCommit") throw new Error(`try to commit a tx with status=${tx.status}`)
    tx.status = "pending"
    tx.executedOps = []

    const storage = this.getStorage()
    for (const op of tx.ops) {
      switch (op.type) {
        case "create": {
          const newObject = await storage.insert(op.newObject)
          tx.executedOps.push({ type: "create", object: newObject })

          let signal = this.cache.get(newObject.id)
          if (!signal) {
            signal = createRoot(() => createSignal<StObject | null>(newObject))
            this.cache.set(newObject.id, signal)
          } else {
            signal[1](newObject)
          }

          break
        }
        case "update": {
          const oldObject = await storage.fetch(op.id)
          if (!oldObject) throw new Error("Object not found")
          await storage.update({ ...op.patch, id: op.id })
          const newObject = await storage.fetch(op.id)
          if (!newObject) throw new Error("Object not found after update")
          tx.executedOps.push({ type: "update", newObject, oldObject })

          const signal = this.cache.get(op.id)
          if (signal) signal[1](newObject)

          break
        }
        case "delete": {
          const deletedObject = await storage.fetch(op.id)
          if (!deletedObject) throw new Error("Object not found")
          await storage.delete(op.id)
          tx.executedOps.push({ type: "delete", deletedObject })

          const signal = this.cache.get(op.id)
          if (signal) signal[1](null)

          break
        }
      }
    }
    tx.status = "committed"
  }
}

class TxObjImpl implements TxObj {
  status: TxStatus = "notCommit"
  ops: TxOpParams[] = []
  executedOps: ExecutedTxOp[] | null = null

  getStatus(): TxStatus {
    return this.status
  }

  create(item: CreateParams) {
    this.ops.push({ type: "create", newObject: item })
  }

  update(id: StObjectId, patch: UpdateParams) {
    this.ops.push({ type: "update", id, patch })
  }

  delete(id: StObjectId) {
    this.ops.push({ type: "delete", id })
  }

  abort() {
    this.status = "aborted"
  }
}
