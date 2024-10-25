import { createContext, useContext } from "react";
import { Board } from "./Board";
import { stdMaxLines } from "./params";
import Cell from "./Cell";
import { getRandomPieceType, PieceType } from "./PieceType";
import LocalStorageCell from "./LocalStorageCell";
import dataCollector from "./dataCollector";
import softmax from "./softmax";
import { ScoreModel } from "./ScoreModel";
import VersusCtx from "./VersusCtx";

export default class TurboStackCtx {
  page = new Cell<'game' | 'review' | 'versus'>('game');
  board = new Cell<Board>(new Board(stdMaxLines));
  currentChoices = new Cell<Board[]>([]);
  currentTop5Choices = new Cell<Board[]>([]);
  currentChoiceWeights = new Cell<number[] | undefined>(undefined);
  currentCellWeights = new Cell<number[][] | undefined>(undefined);
  currentTop5CellWeights = new Cell<number[][] | undefined>(undefined);
  highScores = new LocalStorageCell<number[]>('high-scores', []);
  reviewMode = new Cell<'all' | 'current'>('all');
  autoPlay = new Cell<boolean>(false);
  autoPlayTimer?: NodeJS.Timeout;
  scoreModel?: ScoreModel;
  vs: VersusCtx;

  constructor(scoreModel?: ScoreModel) {
    this.scoreModel = scoreModel;
    this.vs = new VersusCtx(scoreModel, this.page);

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

    this.autoPlay.on('change', () => {
      if (this.autoPlay.get()) {
        (async () => {
          while (true) {
            if (!this.autoPlay.get()) {
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 50));

            const board = this.board.get();
            const currentChoices = this.currentChoices.get();

            if (board.finished) {
              continue;
            }

            const weights = this.currentChoiceWeights.get();

            if (!weights) {
              continue;
            }
  
            const highestWeightIndex = weights.indexOf(Math.max(...weights));

            this.chooseBoard(currentChoices[highestWeightIndex]);
          }
        })();
      } else {
        clearInterval(this.autoPlayTimer);
      }
    });
  }

  async recalculateWeights() {
    if (!this.scoreModel) {
      return;
    }

    const boardEvaluator = this.scoreModel.createBoardEvaluator();

    const choiceWeights = await boardEvaluator(
      this.currentChoices.get().map(c => {
        c = c.clone();
        c.removeClears();
        return c;
      }),
    );

    this.currentChoiceWeights.set(choiceWeights);

    const pseudoProbs = softmax(choiceWeights, 100);

    const cellWeights = [];
    const board = this.board.get();

    for (let i = 0; i < 20; i++) {
      cellWeights.push([] as number[]);

      for (let j = 0; j < 10; j++) {
        let sum = 0;

        if (!board.get(i, j)) {
          for (const [ci, choice] of this.currentChoices.get().entries()) {
            if (choice.get(i, j)) {
              sum += pseudoProbs[ci];
            }
          }
        }

        cellWeights[i].push(sum);
      }
    }

    this.currentCellWeights.set(cellWeights);

    const top5Choices = this.currentChoices.get()
      .map((c, i) => ({ c, w: choiceWeights[i] }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 5)
      .map(({ c }) => c);

    this.currentTop5Choices.set(top5Choices);

    const top5CellWeights = [];

    for (let i = 0; i < 20; i++) {
      top5CellWeights.push([] as number[]);

      for (let j = 0; j < 10; j++) {
        let sum = 0;

        if (!board.get(i, j)) {
          for (const choice of top5Choices) {
            if (choice.get(i, j)) {
              sum += 1 / 5;
            }
          }
        }

        top5CellWeights[i].push(sum);
      }
    }

    this.currentTop5CellWeights.set(top5CellWeights);
  }

  setCurrentPiece(pieceType: PieceType) {
    this.currentChoices.set(
      this.board.get().findChoices(pieceType),
    );

    this.recalculateWeights();
  }

  chooseBoard(choice: Board) {
    if (!this.autoPlay.get()) {
      dataCollector.add(this.board.get(), choice);
    }

    const c = choice.clone();
    c.removeClears();
    this.board.set(c);
  }

  addScore(score: number) {
    try {
      const newHighScores = [...this.highScores.get(), score];
      newHighScores.sort((a, b) => b - a);
      this.highScores.set(newHighScores.slice(0, 10));
    } catch (e) {
      console.error(e);
    }
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
