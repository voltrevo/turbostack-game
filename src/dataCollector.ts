import { Board, BoardJson } from "./Board";
import LocalStorageUnit from "./LocalStorageUnit";

export type DataItem = {
  time?: number,
  lastReview?: number,
  from: BoardJson,
  to: BoardJson,
};

type Game = {
  start: number,
  end: number,
  score: number,
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
      time: Date.now(),
      from: from.toJson(),
      to: to.toJson(),
    });

    this.size.set(i + 1);
  }

  all() {
    const res: DataItem[] = [];
    let skips = 0;

    for (let i = 0; i < this.size.get(); i++) {
      const item = this.at(i).get();

      if (item === undefined) {
        skips++;
        continue;
      }

      res.push(item);
    }

    if (skips > 0) {
      console.log(`Skipped ${skips} items`);
    }

    return res;
  }

  findGames() {
    let gameStart = 0;
    let games = [];

    const len = this.size.get();
    let prevItem: DataItem | undefined = undefined;
    
    for (let i = gameStart; i < len; i++) {
      const item = this.at(i).get();

      if (item === undefined) {
        throw new Error('missing item');
      }

      if (
        (prevItem !== undefined && prevItem.from.score > 0) &&
        item.from.score === 0
      ) {
        games.push({
          start: gameStart,
          end: i,
          score: prevItem.to.score,
        });

        gameStart = i;
      }

      prevItem = item;
    }

    games.sort((a, b) => a.score - b.score);

    return games;
  }

  deleteGame(game: Game) {
    const gameLen = game.end - game.start;
    const len = this.size.get();

    for (let i = game.end; i < len; i++) {
      this.at(i - gameLen).set(this.at(i).get());
    }

    this.size.set(len - gameLen);

    for (let i = 0; i < gameLen; i++) {
      this.at(len - i - 1).set(undefined);
    }
  }
}

const dataCollector = new DataCollector();
(globalThis as Record<string, unknown>).dataCollector = dataCollector;

export default dataCollector;
