import { Board } from "./Board";

export type BoardEvaluator = (boards: Board[]) => number[];
