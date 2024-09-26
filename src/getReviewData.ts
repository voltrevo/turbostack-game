import { Board } from "./Board";
import dataCollector from "./dataCollector";
import { ALL_PIECE_TYPES, PIECE_GRIDS } from "./PieceType";
import { PredictionModel } from "./PredictionModel";
import softmax from "./softMax";

type Unpromise<T> = T extends Promise<infer U> ? U : T;
type AsyncReturnType<T extends (...args: any) => any> = Unpromise<ReturnType<T>>;

export type ReviewData = AsyncReturnType<typeof getReviewData>;

export default async function getReviewData(
  predictionModel: PredictionModel,
  setProgress: (progress: string) => void,
) {
  const boardEvaluator = predictionModel.createBoardEvaluator();
  const points = [];

  const sourceData = dataCollector.all(); //.slice(0, 1000);

  for (const [i, data] of sourceData.entries()) {
    if (data.lastReview !== undefined) {
        continue;
    }

    const from = Board.fromJson(data.from);
    const to = Board.fromJson(data.to);

    const realTo = to.clone();
    realTo.removeClears();

    const pieceType = detectPiece(from, to);
    const choices = from.findChoices(pieceType).map(c => {
        c.removeClears();
        return c;
    });

    let toIndex: number | undefined = undefined;

    for (const [i, c] of choices.entries()) {
      if (Board.equal(c, realTo)) {
        toIndex = i;
      }
    }

    if (toIndex === undefined) {
      console.log(new Error('No choices matched `to` board'));
      continue;
    }

    const probabilities = softmax(boardEvaluator(choices));

    points.push({
      i,
      from,
      to,
      time: data.time,
      pieceType,
      probability: probabilities[toIndex],
    });

    setProgress(`${i + 1}/${sourceData.length}`);

    await new Promise(resolve => setTimeout(resolve));
  }

  points.sort((a, b) => a.probability - b.probability);

  return points;
}

type IJ = { i: number, j: number };

function detectPiece(from: Board, to: Board) {
    let start: IJ | undefined = undefined;
    const relPositions = [];

    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 10; j++) {
            if (to.get(i, j) && !from.get(i, j)) {
                if (start === undefined) {
                    start = { i, j };
                } else {
                    relPositions.push({
                        i: i - start.i,
                        j: j - start.j,
                    });
                }
            }
        }
    }

    if (relPositions.length !== 3) {
        throw new Error(`Failed to find 4 blocks in tetromino`);
    }

    for (let pieceIndex = 0; pieceIndex < detectPieceStaticData.length; pieceIndex++) {
        for (const piecePattern of detectPieceStaticData[pieceIndex]) {
            let match = true;

            for (let x = 0; x < 3; x++) {
                if (
                    relPositions[x].i !== piecePattern[x].i ||
                    relPositions[x].j !== piecePattern[x].j
                ) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return ALL_PIECE_TYPES[pieceIndex];
            }
        }
    }

    throw new Error('Failed to detect piece');
}

const detectPieceStaticData = (() => ALL_PIECE_TYPES.map(
    (pieceType) => PIECE_GRIDS[pieceType].map((g => {
        let start: IJ | undefined = undefined;
        const relPositions = [];

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const bit = (g & (1 << (4 * i + j))) !== 0;

                if (bit) {
                    if (start === undefined) {
                        start = { i, j };
                    } else {
                        relPositions.push({
                            i: i - start.i,
                            j: j - start.j,
                        });
                    }
                }
            }
        }

        if (relPositions.length !== 3) {
            throw new Error('Failed to find 4 blocks in tetromino');
        }

        return relPositions as [IJ, IJ, IJ];
    })),
))();
