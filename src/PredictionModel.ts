import * as tf from '@tensorflow/tfjs';
import { Board } from './Board';
import { BoardEvaluator } from './BoardEvaluator';
import { evalNodeCount, extraFeatureLen } from './hyperParams';

export type PredictionModelDataPoint = {
    from: Board;
    to: Board;
};

const spatialShape = [21, 12, 1];
const extraShape = [extraFeatureLen];

export class PredictionModel {
    public learningRate: number;

    constructor(
        public evalModel: tf.LayersModel,
        public combinedModel: tf.LayersModel,
    ) {
        this.learningRate = 0.001;
        this.setLearningRate(this.learningRate);
    }

    static createEvalModel(): tf.LayersModel {
        const boardInput = tf.input({ shape: spatialShape });
        const paramsInput = tf.input({ shape: extraShape });

        let tensor = tf.layers.conv2d({
            filters: 8,
            kernelSize: [5, 3],
        }).apply(boardInput) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.conv2d({
            filters: 16,
            kernelSize: [1, 10],
        }).apply(tensor) as tf.SymbolicTensor;

        // tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.flatten().apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.concatenate().apply([
            tensor,
            paramsInput,
        ]) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 16,
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        // tensor = tf.layers.dense({
        //     units: 8,
        //     activation: 'relu',
        // }).apply(tensor) as tf.SymbolicTensor;

        // tensor = tf.layers.dropout({ rate: 0.2 }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.dense({
            units: 1,
        }).apply(tensor) as tf.SymbolicTensor;

        tensor = tf.layers.leakyReLU({ alpha: 0.01 }).apply(tensor) as tf.SymbolicTensor;

        const model = tf.model({ inputs: [boardInput, paramsInput], outputs: tensor });

        return model;
    }

    static createCombinedModel(evalModel: tf.LayersModel) {
        const inputs = [];
        const evals = [];

        for (let i = 0; i < evalNodeCount; i++) {
            const spatialInput = tf.input({ shape: spatialShape });
            const extraInput = tf.input({ shape: extraShape });

            evals.push(evalModel.apply([spatialInput, extraInput]) as tf.SymbolicTensor);

            inputs.push(spatialInput);
            inputs.push(extraInput);
        }

        let tensor = tf.layers.concatenate().apply(evals);
        tensor = tf.layers.activation({ activation: 'softmax' }).apply(tensor);

        return tf.model({
            inputs,
            outputs: tensor as tf.SymbolicTensor,
        });
    }

    static async load() {
        try {
            const evalModel = await tf.loadLayersModel(location.href + 'data/predictionModel/model.json');
            const combinedModel = PredictionModel.createCombinedModel(evalModel);

            return new PredictionModel(evalModel, combinedModel);
        } catch {
            console.log('Failed to load model, perhaps it is not available');
            return undefined;
        }
    }

    setLearningRate(learningRate: number) {
        this.learningRate = learningRate;

        this.combinedModel.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'categoricalCrossentropy',
        });
    }

    createBoardEvaluator(): BoardEvaluator {
        return (boards: Board[]): number[] => {
            const mlInputData = boards.map(b => b.toMlInputData());

            // Extract boards, scores, and lines remaining from the input boards
            const boardData: Uint8Array[] = mlInputData.map(d => d.boardData);
            const extraData: number[][] = mlInputData.map(d => [...d.extraFeatures]);

            // Prepare tensors for the model
            const inputTensors: tf.Tensor<tf.Rank>[] = [];

            inputTensors.push(
                // Shape: [batchSize, rows, cols, channels]
                tf.tensor(boardData).reshape([boards.length, 21, 12, 1]),
            );

            inputTensors.push(
                // Shape: [batchSize, extraFeatureLen]
                tf.tensor(extraData).reshape([boards.length, extraFeatureLen]),
            );

            // Perform batch inference
            const evals = this.evalModel.predict(inputTensors) as tf.Tensor;

            // Get the evals as a flat array
            // Convert Float32Array to a normal array
            return Array.from(evals.dataSync());
        };
    }
}
