/**
 * A class that batches processing of inputs using microtasks to optimize performance.
 * 
 * @template Input The type of the input items.
 * @template Output The type of the output items.
 */
export default class BatchProcessor<Input, Output> {
    /**
     * Queue of pending requests.
     * Each request contains the inputs to process and the corresponding promise handlers.
     */
    private requestQueue: {
        resolve: (value: Output[]) => void;
        reject: (reason: any) => void;
        inputs: Input[];
    }[] = [];

    /** Total number of inputs currently in the queue. */
    private queueSize = 0;

    /** Queue size during the last microtask iteration. Used to detect new inputs. */
    private lastQueueSize = 0;

    /** Counts how many microtasks have passed without new inputs being added. */
    private microtaskIdleCount = 0;

    /** The microtask loop instance that manages batching logic. */
    private microtaskLoop: MicrotaskLoop;

    /** The core evaluator function that processes an array of inputs to produce outputs. */
    private coreEvaluator: (inputs: Input[]) => Output[];

    /** The maximum number of inputs to process in one batch. */
    private batchSizeThreshold: number;

    /**
     * Private constructor to initialize the BatchProcessor.
     * Use the static `create` method to instantiate.
     * 
     * @param coreEvaluator The function that processes an array of inputs and returns an array of outputs.
     * @param batchSizeThreshold The threshold at which the batch will be processed immediately.
     */
    private constructor(
        coreEvaluator: (inputs: Input[]) => Output[],
        batchSizeThreshold: number
    ) {
        this.coreEvaluator = coreEvaluator;
        this.batchSizeThreshold = batchSizeThreshold;
        this.microtaskLoop = new MicrotaskLoop(this.microtaskTask.bind(this));
    }

    /**
     * Processes all inputs in the queue using the core evaluator and resolves promises.
     */
    private processQueue() {
        if (this.queueSize === 0) return;

        // Copy and reset the queue
        const queuedRequests = this.requestQueue.splice(0, this.requestQueue.length);
        this.queueSize = 0;
        this.lastQueueSize = 0;
        this.microtaskIdleCount = 0;

        // Combine all inputs into one array
        const allInputs: Input[] = [];
        for (const req of queuedRequests) {
            allInputs.push(...req.inputs);
        }

        try {
            // Evaluate all inputs using the core evaluator
            const allResults = this.coreEvaluator(allInputs);

            // Distribute results back to the individual promises
            let resultIndex = 0;
            for (const req of queuedRequests) {
                const { inputs, resolve } = req;
                const resultSlice = allResults.slice(
                    resultIndex,
                    resultIndex + inputs.length
                );
                resolve(resultSlice);
                resultIndex += inputs.length;
            }
        } catch (error) {
            // If there's an error, reject all promises
            for (const req of queuedRequests) {
                req.reject(error);
            }
        }
    }

    /**
     * The task run in each microtask to check if new inputs have been added and decide when to process the batch.
     */
    private microtaskTask() {
        if (this.queueSize >= this.batchSizeThreshold) {
            // Process immediately if batch size threshold is reached
            this.processQueue();
            this.microtaskLoop.stop();
        } else if (this.queueSize > this.lastQueueSize) {
            // New inputs have been added; reset idle count
            this.lastQueueSize = this.queueSize;
            this.microtaskIdleCount = 0;
        } else {
            // No new inputs added; increment idle count
            this.microtaskIdleCount++;
            if (this.microtaskIdleCount >= 3) {
                // Process the batch if idle for 3 microtasks
                this.processQueue();
                this.microtaskLoop.stop();
            }
        }
    }

    /**
     * Adds inputs to the processing queue and returns a promise that resolves with the outputs.
     * 
     * @param inputs An array of inputs to process.
     * @returns A promise that resolves with an array of outputs corresponding to the inputs.
     */
    public process(inputs: Input[]): Promise<Output[]> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ resolve, reject, inputs });
            this.queueSize += inputs.length;

            // Reset idle count since new inputs have been added
            this.microtaskIdleCount = 0;

            // Start the microtask loop if not already running
            this.microtaskLoop.start();
        });
    }

    /**
     * Creates a new BatchProcessor instance and returns a bound `process` function.
     * 
     * @template Input The type of the input items.
     * @template Output The type of the output items.
     * @param coreEvaluator The function that processes an array of inputs and returns an array of outputs.
     * @param batchSizeThreshold The maximum number of inputs to process in one batch.
     * @returns A function that accepts an array of inputs and returns a promise of outputs.
     */
    public static create<Input, Output>(
        coreEvaluator: (inputs: Input[]) => Output[],
        batchSizeThreshold: number
    ): (inputs: Input[]) => Promise<Output[]> {
        const processor = new BatchProcessor<Input, Output>(coreEvaluator, batchSizeThreshold);
        return processor.process.bind(processor);
    }
}

/**
 * A class that manages running a task in a microtask loop.
 */
export class MicrotaskLoop {
    /** Indicates whether the loop is currently running. */
    private running = false;

    /** The task function to run in each microtask. */
    private task: () => void;

    /**
     * Creates a new MicrotaskLoop instance.
     * 
     * @param task The function to execute in each microtask iteration.
     */
    constructor(task: () => void) {
        this.task = task;
    }

    /**
     * Starts the microtask loop if it's not already running.
     */
    start() {
        if (!this.running) {
            this.running = true;
            this.loop();
        }
    }

    /**
     * Stops the microtask loop.
     */
    stop() {
        this.running = false;
    }

    /**
     * Internal method that schedules the task to run in the next microtask.
     */
    private loop() {
        if (!this.running) return;
        queueMicrotask(() => {
            if (!this.running) return;
            this.task();
            if (this.running) {
                this.loop();
            }
        });
    }
}
