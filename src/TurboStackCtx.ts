import { createContext, useContext } from "react";
import { Board } from "./Board";
import { stdMaxLines } from "./params";
import Cell from "./Cell";
import { getRandomPieceType } from "./PieceType";

export default class TurboStackCtx {
  board = new Cell<Board>(new Board(stdMaxLines));
  currentChoices = new Cell<Board[]>([]);
  boardSequence: Board[] = [];
  highScores = new Cell<number[]>([]);

  constructor() {
    const handleBoardChange = () => {
      this.currentChoices.set(
        this.board.get().findChoices(getRandomPieceType()),
      );
    };

    handleBoardChange();
    this.board.on('change', handleBoardChange);
  }

  chooseBoard(choice: Board) {
    const c = choice.clone();
    c.removeClears();

    this.board.set(c);
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
