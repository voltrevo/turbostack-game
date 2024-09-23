import { Board, BoardJson } from "./Board";
import LocalStorageUnit from "./LocalStorageUnit";

type DataItem = {
  from: BoardJson,
  to: BoardJson,
};

class DataCollector {
  size = new LocalStorageUnit('dataCollector-size', 0);

  at(i: number) {
    return new LocalStorageUnit<DataItem | undefined>(
      `dataCollector-item-${i}`,
      undefined,
    );
  }

  add(from: Board, to: Board) {
    const i = this.size.get();

    this.at(i).set({
      from: from.toJson(),
      to: to.toJson(),
    });

    this.size.set(i + 1);
  }

  all() {
    const res: DataItem[] = [];

    for (let i = 0; i < this.size.get(); i++) {
      const item = this.at(i).get();

      if (item === undefined) {
        throw new Error('missing item');
      }

      res.push(item);
    }

    return res;
  }
}

const dataCollector = new DataCollector();
(globalThis as Record<string, unknown>).dataCollector = dataCollector;

export default dataCollector;
