import { EventEmitter } from "ee-typed";
import Cell from "./Cell";

export default class LocalStorageCell<T> extends EventEmitter<{ change(): void }> {
  private cell: Cell<T>;
  private storageKey: string;

  constructor(storageKey: string, defaultValue: T) {
    super();
    this.storageKey = storageKey;

    const stored = localStorage.getItem(this.storageKey);

    let value;

    if (stored !== null) {
      value = JSON.parse(stored) as T;
    } else {
      value = defaultValue;
    }

    this.cell = new Cell(value);
    this.cell.on('change', () => this.emit('change'));
  }

  get() {
    return this.cell.get();
  }

  set(value: T) {
    localStorage.setItem(this.storageKey, JSON.stringify(value));
    this.cell.set(value);
  }

  use() {
    return this.cell.use();
  }
}
