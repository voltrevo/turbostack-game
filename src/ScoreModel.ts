import fs from 'fs/promises';

import * as tf from '@tensorflow/tfjs';
import { Board } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import BatchProcessor from './BatchProcessor';

export class ScoreModel {
    constructor(public tfModel: tf.LayersModel) {}

    async save(name = 'scoreModel') {
        await fs.mkdir(`data/${name}`, { recursive: true });
        await this.tfModel.save(`file://data/${name}`);
    }

    static async load() {
        try {
            const model = await tf.loadLayersModel(location.href + 'scoreModel/model.json');

            return new ScoreModel(model);
        } catch {
            console.log('Failed to load model, perhaps it is not available');
            return undefined;
        }
    }

    batchBoardEvaluator?: BoardEvaluator;

    createBoardEvaluator(): BoardEvaluator {
        if (!this.batchBoardEvaluator) {
            this.batchBoardEvaluator = BatchProcessor.create(
                boards => this.coreBoardEvaluator(boards),
                512,
            );
        }

        return this.batchBoardEvaluator;
    }

    coreBoardEvaluator(boards: Board[]): number[] {
        return this.predictMean(boards).map(({ mean }) => mean);
    }

    predictMean(boards: Board[]): { mean: number }[] {
        const mlInputData = boards.map(b => b.toMlInputData());

        // Extract boards, scores, and lines remaining from the input boards
        const boardData: Uint8Array[] = mlInputData.map(d => d.boardData);
        const scoreData: number[] = mlInputData.map(d => d.score);
        const linesRemainingData: number[] = mlInputData.map(d => d.linesRemaining);

        // Prepare tensors for the model
        const inputTensors: tf.Tensor<tf.Rank>[] = [
            tf.tensor(boardData).reshape([boards.length, 21, 12, 1]),
            tf.tensor(scoreData).reshape([boards.length, 1]),
            tf.tensor(linesRemainingData).reshape([boards.length, 1]),
        ];

        // Perform batch inference
        const predictions = this.tfModel.predict(inputTensors) as tf.Tensor;

        const means = predictions.dataSync();

        inputTensors.forEach(t => t.dispose());
        predictions.dispose();

        return Array.from({ length: boards.length }, (_, i) => ({
            mean: means[i],
        }));
    }
}
