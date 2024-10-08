import { Board } from "./Board";
import { randomBoardEvaluator } from "./BoardEvaluator";
import Cell from "./Cell";
import dataCollector from "./dataCollector";
import { stdMaxLines } from "./hyperParams";
import { getRandomPieceType } from "./PieceType";
import { ScoreModel } from "./ScoreModel";

export default class VersusCtx {
  boards = {
    player: new Cell<Board>(new Board(stdMaxLines)),
    ai: new Cell<Board>(new Board(stdMaxLines)),
    aiNextBoard: new Cell<Board>(new Board(stdMaxLines)),
  };
  currentChoices = new Cell<Board[]>([]);

  constructor(public scoreModel?: ScoreModel) {
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
    const aiNext = this.boards.aiNextBoard.get().clone();
    aiNext.removeClears();
    this.boards.ai.set(aiNext);

    this.setupNewPiece();
  }

  boardEvaluator() {
    if (this.scoreModel) {
      return this.scoreModel.createBoardEvaluator();
    }

    return randomBoardEvaluator;
  }
}
