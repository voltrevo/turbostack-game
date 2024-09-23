import { createContext, useContext } from "react";
import { Board } from "./Board";
import { stdMaxLines } from "./params";
import Cell from "./Cell";
import { getRandomPieceType } from "./PieceType";
import LocalStorageCell from "./LocalStorageCell";

export default class TurboStackCtx {
  board = new Cell<Board>(new Board(stdMaxLines));
  currentChoices = new Cell<Board[]>([]);
  boardSequence: Board[] = [];
  highScores = new LocalStorageCell<number[]>('high-scores', []);

  constructor() {
    const handleBoardChange = () => {
      this.currentChoices.set(
        this.board.get().findChoices(getRandomPieceType()),
      );

      if (this.board.get().finished) {
        this.addScore(this.board.get().score);
      }
    };

    handleBoardChange();
    this.board.on('change', handleBoardChange);
  }

  chooseBoard(choice: Board) {
    const c = choice.clone();
    c.removeClears();
    this.board.set(c);
  }

  addScore(score: number) {
    const newHighScores = [...this.highScores.get(), score];
    newHighScores.sort((a, b) => b - a);
    this.highScores.set(newHighScores);
  }

  restart() {
    this.board.set(new Board(stdMaxLines));
    this.boardSequence = []; // todo: save old
  }

  private static context = createContext<TurboStackCtx>(
    {} as TurboStackCtx,
  );

  static Provider = TurboStackCtx.context.Provider;

  static use() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useContext(TurboStackCtx.context);
  }
}
