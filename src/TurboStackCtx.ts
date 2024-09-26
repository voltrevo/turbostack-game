import { createContext, useContext } from "react";
import { Board } from "./Board";
import { stdMaxLines } from "./params";
import Cell from "./Cell";
import { getRandomPieceType } from "./PieceType";
import LocalStorageCell from "./LocalStorageCell";
import dataCollector from "./dataCollector";
import { PredictionModel } from "./PredictionModel";
import softmax from "./softMax";

export default class TurboStackCtx {
  board = new Cell<Board>(new Board(stdMaxLines));
  currentChoices = new Cell<Board[]>([]);
  currentChoiceWeights = new Cell<number[][] | undefined>(undefined);
  highScores = new LocalStorageCell<number[]>('high-scores', []);
  predictionModel?: PredictionModel;

  constructor(predictionModel?: PredictionModel) {
    this.predictionModel = predictionModel;

    const handleBoardChange = () => {
      this.currentChoices.set(
        this.board.get().findChoices(getRandomPieceType()),
      );

      this.recalculateWeights();

      if (this.board.get().finished) {
        this.addScore(this.board.get().score);
      }
    };

    handleBoardChange();
    this.board.on('change', handleBoardChange);
  }

  recalculateWeights() {
    if (!this.predictionModel) {
      return;
    }

    const boardEvaluator = this.predictionModel.createBoardEvaluator();

    const choiceWeights = softmax(boardEvaluator(
      this.currentChoices.get().map(c => {
        c = c.clone();
        c.removeClears();
        return c;
      }),
    ));

    const cellWeights = [];
    const board = this.board.get();

    for (let i = 0; i < 20; i++) {
      cellWeights.push([] as number[]);

      for (let j = 0; j < 10; j++) {
        let sum = 0;

        if (!board.get(i, j)) {
          for (const [ci, choice] of this.currentChoices.get().entries()) {
            if (choice.get(i, j)) {
              sum += choiceWeights[ci];
            }
          }
        }

        cellWeights[i].push(sum);
      }
    }

    this.currentChoiceWeights.set(cellWeights);
  }

  chooseBoard(choice: Board) {
    dataCollector.add(this.board.get(), choice);
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
  }

  downloadData() {
    const data = dataCollector.all();

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' },
    );

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `turbostack-data-${Date.now()}.json`;

    // Trigger the download
    link.click();

    // Clean up
    URL.revokeObjectURL(link.href);
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
