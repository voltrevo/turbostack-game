import { Board } from "./Board";
import dataCollector from "./dataCollector";
import never from "./never";
import { ALL_PIECE_TYPES, PIECE_GRIDS } from "./PieceType";
import { ScoreModel } from "./ScoreModel";

type Unpromise<T> = T extends Promise<infer U> ? U : T;
type AsyncReturnType<T extends (...args: any) => any> = Unpromise<ReturnType<T>>;

export type ReviewData = AsyncReturnType<typeof getReviewData>;

export default async function getReviewData(
  mode: 'all' | 'current',
  scoreModel: ScoreModel,
  setProgress: (progress: string) => void,
) {
  const boardEvaluator = scoreModel.createBoardEvaluator();
  const points = [];

  let sourceData;

  if (mode === 'all') {
    sourceData = dataCollector.all();
  } else if (mode === 'current') {
    sourceData = dataCollector.allSinceLoad();
  } else {
    never(mode);
  }

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

    let weights = await boardEvaluator(choices);

    points.push({
      i,
      from,
      to,
      time: data.time,
      pieceType,
      weight: weights[toIndex],
      maxWeight: Math.max(...weights),
    });

    setProgress(`${i + 1}/${sourceData.length}`);

    await new Promise(resolve => setTimeout(resolve));
  }

  points.sort((a, b) => (a.weight - a.maxWeight) - (b.weight - b.maxWeight));

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
