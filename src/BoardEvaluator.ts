import { Board } from "./Board";
import { ALL_PIECE_TYPES } from "./PieceType";

export type CoreBoardEvaluator = (boards: Board[]) => number[];
export type BoardEvaluator = (boards: Board[]) => Promise<number[]>;

export function deeperBoardEvaluator(boardEvaluator: BoardEvaluator): BoardEvaluator {
    return async boards => {
        // for each board, figure out what to do on the next move for each of the 7 pieces, then
        // average the evals for each one

        const evals = [];

        for (const board of boards) {
            let sum = 0;

            for (const pieceType of ALL_PIECE_TYPES) {
                const choices = board.findChoices(pieceType);
                const choiceEvals = await boardEvaluator(choices);
                const highestEval = Math.max(...choiceEvals)
                sum += highestEval;
            }

            evals.push(sum / ALL_PIECE_TYPES.length);
        }

        return evals;
    };
}

export const randomBoardEvaluator: BoardEvaluator = async (boards: Board[]): Promise<number[]> => {
    return boards.map(_b => Math.random());
}
