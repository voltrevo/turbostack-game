import { Board } from "./Board";
import { randomBoardEvaluator } from "./BoardEvaluator";
import Cell from "./Cell";
import dataCollector from "./dataCollector";
import { stdMaxLines } from "./hyperParams";
import { getRandomPieceType } from "./PieceType";
import { ScoreModel } from "./ScoreModel";
import TurboStackCtx from "./TurboStackCtx";

export default class VersusCtx {
  boards = {
    player: new Cell<Board>(new Board(stdMaxLines)),
    ai: new Cell<Board>(new Board(stdMaxLines)),
    aiNextBoard: new Cell<Board>(new Board(stdMaxLines)),
  };
  currentChoices = new Cell<Board[]>([]);
  gameOver = new Cell<boolean>(false);

  constructor(
    public scoreModel: ScoreModel | undefined,
    public page: TurboStackCtx['page'],
  ) {
    this.setupNewPiece();
  }

  restart() {
    this.boards.player.set(new Board(stdMaxLines));
    this.boards.ai.set(new Board(stdMaxLines));
    this.boards.aiNextBoard.set(new Board(stdMaxLines));
    this.gameOver.set(false);
    this.setupNewPiece();
  }

  async setupNewPiece() {
    const piece = getRandomPieceType();

    this.currentChoices.set(
      this.boards.player.get().findChoices(piece)
    );

    const aiBoard = this.boards.ai.get();
    const aiChoices = aiBoard.findChoices(piece);

    const aiChoicesWithClears = aiChoices.map(c => {
      const c2 = c.clone();
      c2.removeClears();
      return c2;
    });

    const aiEvals = await this.boardEvaluator()(aiChoicesWithClears);
    const aiChoice = aiChoices[aiEvals.indexOf(Math.max(...aiEvals))] ?? aiBoard;

    this.boards.aiNextBoard.set(aiChoice);
  }

  chooseBoard(choice: Board) {
    dataCollector.add(this.boards.player.get(), choice);

    const c = choice.clone();
    c.removeClears();

    this.boards.player.set(c);
    this.next();
  }

  async next() {
    const aiNext = this.boards.aiNextBoard.get().clone();
    aiNext.removeClears();
    this.boards.ai.set(aiNext);
    this.setupNewPiece();

    if (!this.boards.player.get().finished || this.page.get() !== 'versus') {
      return;
    }

    if (
      !aiNext.finished &&
      aiNext.score <= this.boards.player.get().score
    ) {
      setTimeout(() => {
        this.next();
      }, 500);
    } else {
      this.gameOver.set(true);
    }
  }

  boardEvaluator() {
    if (this.scoreModel) {
      return this.scoreModel.createBoardEvaluator();
    }

    return randomBoardEvaluator;
  }
}
