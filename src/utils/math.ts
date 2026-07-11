import { ColumnSchema, NetworkConfig, TrainingMetric } from "../types";

// Standard mathematical helpers
export const math = {
  tanh: (x: number): number => {
    return Math.tanh(x);
  },
  tanhDeriv: (a: number): number => {
    // a is the tanh activation value
    return 1 - a * a;
  },
  sigmoid: (x: number): number => {
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
  },
  sigmoidDeriv: (a: number): number => {
    // a is the sigmoid activation value
    return a * (1 - a);
  },
  softmax: (arr: number[]): number[] => {
    const maxVal = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - maxVal));
    const sum = exps.reduce((s, x) => s + x, 0);
    return exps.map(x => (sum === 0 ? 0 : x / sum));
  },
  sqrt: (x: number): number => {
    return Math.sqrt(x);
  }
};

export interface NetworkLayer {
  weights: number[][]; // [neuronIdx][inputIdx]
  biases: number[];    // [neuronIdx]
  vWeights?: number[][]; // momentum weight updates
  vBiases?: number[];   // momentum bias updates
}

export class NeuralNetwork {
  layers: NetworkLayer[] = [];
  outputType: "regression" | "classification" = "regression";
  numClasses = 1;
  classCategories: string[] = [];

  constructor(
    inputSize: number,
    hiddenLayerSizes: number[],
    outputSize: number,
    outputType: "regression" | "classification",
    classCategories: string[] = []
  ) {
    this.outputType = outputType;
    this.numClasses = outputSize;
    this.classCategories = classCategories;

    const layerSizes = [inputSize, ...hiddenLayerSizes, outputSize];

    for (let i = 1; i < layerSizes.length; i++) {
      const prevSize = layerSizes[i - 1];
      const currSize = layerSizes[i];

      // Xavier/Glorot Initialization
      const limit = Math.sqrt(6 / (prevSize + currSize));
      const weights: number[][] = [];
      const biases: number[] = [];

      for (let r = 0; i < layerSizes.length && r < currSize; r++) {
        const row: number[] = [];
        for (let c = 0; c < prevSize; c++) {
          row.push((Math.random() * 2 - 1) * limit);
        }
        weights.push(row);
        biases.push((Math.random() * 2 - 1) * 0.1);
      }

      this.layers.push({
        weights,
        biases,
        vWeights: weights.map(row => row.map(() => 0)),
        vBiases: biases.map(() => 0)
      });
    }
  }

  // Forward Pass
  // Returns: { zs: number[][], activations: number[][] }
  // zs[l] and activations[l] correspond to the l-th layer outputs
  forward(x: number[]): { zs: number[][]; activations: number[][] } {
    const zs: number[][] = [];
    const activations: number[][] = [x]; // Input is the 0-th activation

    let currentActivation = [...x];

    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const z: number[] = [];
      const a: number[] = [];

      const isLastLayer = l === this.layers.length - 1;

      for (let n = 0; n < layer.weights.length; n++) {
        let sum = layer.biases[n];
        for (let i = 0; i < layer.weights[n].length; i++) {
          sum += layer.weights[n][i] * currentActivation[i];
        }
        z.push(sum);

        if (!isLastLayer) {
          a.push(math.tanh(sum)); // hidden layers use tanh
        }
      }

      if (isLastLayer) {
        if (this.outputType === "classification") {
          const probs = math.softmax(z);
          a.push(...probs);
        } else {
          // Regression: linear output
          a.push(...z);
        }
      }

      zs.push(z);
      activations.push(a);
      currentActivation = [...a];
    }

    return { zs, activations };
  }

  // Backpropagation for a single training step
  // Returns the computed loss gradients for weights and biases
  backprop(
    x: number[],
    target: number[],
    learningRate: number
  ): { loss: number; output: number[] } {
    const { zs, activations } = this.forward(x);
    const output = activations[activations.length - 1];

    // Compute Loss
    let loss = 0;
    const deltas: number[][] = [];

    // Initialize array of deltas for each layer
    for (let l = 0; l < this.layers.length; l++) {
      deltas.push([]);
    }

    const lastLayerIdx = this.layers.length - 1;
    const lastLayerAct = activations[activations.length - 1];

    if (this.outputType === "classification") {
      // Cross-Entropy Loss with Softmax
      const targetIdx = target.indexOf(1);
      const prob = lastLayerAct[targetIdx >= 0 ? targetIdx : 0] || 1e-15;
      loss = -Math.log(Math.max(1e-15, prob));

      // Output error delta for Softmax Cross-Entropy is simply (p - y)
      const d: number[] = [];
      for (let n = 0; n < lastLayerAct.length; n++) {
        d.push(lastLayerAct[n] - target[n]);
      }
      deltas[lastLayerIdx] = d;
    } else {
      // Regression: MSE loss
      let sumSq = 0;
      const d: number[] = [];
      for (let n = 0; n < lastLayerAct.length; n++) {
        const error = lastLayerAct[n] - target[n];
        sumSq += error * error;
        d.push(error); // delta for identity output linear layer
      }
      loss = 0.5 * sumSq;
      deltas[lastLayerIdx] = d;
    }

    // Backpropagate deltas
    for (let l = lastLayerIdx - 1; l >= 0; l--) {
      const layer = this.layers[l];
      const nextLayer = this.layers[l + 1];
      const nextDeltas = deltas[l + 1];
      const currentAct = activations[l + 1]; // activation of current l-th layer

      const currentDeltas: number[] = [];
      for (let n = 0; n < layer.weights.length; n++) {
        let errorSum = 0;
        for (let nextN = 0; nextN < nextLayer.weights.length; nextN++) {
          errorSum += nextLayer.weights[nextN][n] * nextDeltas[nextN];
        }
        // Activation of hidden units is tanh
        const deriv = math.tanhDeriv(currentAct[n]);
        currentDeltas.push(errorSum * deriv);
      }
      deltas[l] = currentDeltas;
    }

    // Update Weights and Biases (with simple momentum gradient descent)
    const beta = 0.9; // momentum coefficient
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const currentDeltas = deltas[l];
      const prevLayerAct = activations[l]; // activations fed into l-th layer

      for (let n = 0; n < layer.weights.length; n++) {
        const dBias = currentDeltas[n];
        layer.vBiases![n] = beta * layer.vBiases![n] + (1 - beta) * dBias;
        layer.biases[n] -= learningRate * layer.vBiases![n];

        for (let i = 0; i < layer.weights[n].length; i++) {
          const dWeight = currentDeltas[n] * prevLayerAct[i];
          layer.vWeights![n][i] = beta * layer.vWeights![n][i] + (1 - beta) * dWeight;
          layer.weights[n][i] -= learningRate * layer.vWeights![n][i];
        }
      }
    }

    return { loss, output };
  }

  // Calculate Relative Feature Importance using Garson's Algorithm
  // Traces absolute weight connection strengths from input layer to hidden layers
  calculateFeatureImportance(featureNames: string[]): { name: string; score: number }[] {
    if (this.layers.length === 0) {
      return featureNames.map(name => ({ name, score: 0 }));
    }

    const numInputs = this.layers[0].weights[0].length;
    const importances: number[] = new Array(numInputs).fill(0);

    // Garson's algorithm for a single hidden layer
    if (this.layers.length === 1) {
      const weights = this.layers[0].weights;
      for (let i = 0; i < numInputs; i++) {
        let sum = 0;
        for (let n = 0; n < weights.length; n++) {
          sum += Math.abs(weights[n][i]);
        }
        importances[i] = sum;
      }
    } else {
      // Multi-layer connection weights mapping
      const firstLayerWeights = this.layers[0].weights; // [hidden1][input]
      const numHidden1 = firstLayerWeights.length;

      // Sum connection paths from each input through hidden neuron relative magnitudes
      const rowSums: number[] = new Array(numHidden1).fill(0);
      for (let h = 0; h < numHidden1; h++) {
        for (let i = 0; i < numInputs; i++) {
          rowSums[h] += Math.abs(firstLayerWeights[h][i]);
        }
      }

      for (let i = 0; i < numInputs; i++) {
        let inputContributionSum = 0;
        for (let h = 0; h < numHidden1; h++) {
          const relWeight = Math.abs(firstLayerWeights[h][i]) / (rowSums[h] || 1e-15);
          
          // Multiply relative first-layer weight by absolute second-layer weights
          let outputInfluenceSum = 0;
          const secondLayerWeights = this.layers[1].weights; // [hidden2][hidden1]
          for (let h2 = 0; h2 < secondLayerWeights.length; h2++) {
            outputInfluenceSum += Math.abs(secondLayerWeights[h2][h]);
          }

          inputContributionSum += relWeight * outputInfluenceSum;
        }
        importances[i] = inputContributionSum;
      }
    }

    // Normalize importances to sum to 100
    const totalImportance = importances.reduce((s, x) => s + x, 0);
    const normalized = importances.map((imp, idx) => ({
      name: featureNames[idx] || `Feature ${idx + 1}`,
      score: totalImportance === 0 ? 100 / numInputs : (imp / totalImportance) * 100
    }));

    // Sort descending
    return normalized.sort((a, b) => b.score - a.score);
  }
}

// Data Preprocessing and Normalization helpers
export interface NormalizationParams {
  mean: number[];
  std: number[];
  isCategorical: boolean[];
  categoricalValues: { [colIdx: number]: string[] };
}

export function preprocessDataset(
  headers: string[],
  rows: string[][],
  schema: ColumnSchema[]
) {
  const featureCols = schema.filter(c => c.type === "feature");
  const targetCol = schema.find(c => c.type === "target");

  if (featureCols.length === 0 || !targetCol) {
    throw new Error("Ensure at least one input feature and exactly one target column are selected.");
  }

  const featureIndices = featureCols.map(col => headers.indexOf(col.name));
  const targetIndex = headers.indexOf(targetCol.name);

  // Initialize categorical column domains
  const categoricalValues: { [colIdx: number]: string[] } = {};
  schema.forEach((col, idx) => {
    const colIdx = headers.indexOf(col.name);
    if (col.dataType === "categorical" && colIdx !== -1) {
      // Find all unique non-empty values
      const uniques = Array.from(
        new Set(rows.map(r => r[colIdx]?.trim()).filter(Boolean))
      ).sort();
      categoricalValues[colIdx] = uniques;
    }
  });

  // Convert raw rows to numeric arrays, handling categorical one-hot encoding
  const X: number[][] = [];
  const y: number[][] = [];

  // Categorical values for classification target
  const targetCategories = targetCol.dataType === "categorical"
    ? (categoricalValues[targetIndex] || [])
    : [];

  const isClassification = targetCol.dataType === "categorical";

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    
    // Process features
    const processedFeatures: number[] = [];
    let isValidRow = true;

    for (let f = 0; f < featureIndices.length; f++) {
      const idx = featureIndices[f];
      const valStr = row[idx]?.trim();
      const colSchema = schema.find(c => headers.indexOf(c.name) === idx);

      if (colSchema?.dataType === "categorical") {
        const cats = categoricalValues[idx] || [];
        const oneHot = new Array(Math.max(1, cats.length)).fill(0);
        const catIdx = cats.indexOf(valStr);
        if (catIdx !== -1) {
          oneHot[catIdx] = 1;
        }
        processedFeatures.push(...oneHot);
      } else {
        const valNum = parseFloat(valStr);
        if (isNaN(valNum)) {
          isValidRow = false;
          break;
        }
        processedFeatures.push(valNum);
      }
    }

    if (!isValidRow) continue;

    // Process targets
    const processedTargets: number[] = [];
    const targetValStr = row[targetIndex]?.trim();

    if (isClassification) {
      const oneHot = new Array(Math.max(1, targetCategories.length)).fill(0);
      const catIdx = targetCategories.indexOf(targetValStr);
      if (catIdx !== -1) {
        oneHot[catIdx] = 1;
      } else {
        // If not found, skip or default
        oneHot[0] = 1;
      }
      processedTargets.push(...oneHot);
    } else {
      const valNum = parseFloat(targetValStr);
      if (isNaN(valNum)) continue; // skip row if target is invalid
      processedTargets.push(valNum);
    }

    X.push(processedFeatures);
    y.push(processedTargets);
  }

  if (X.length === 0) {
    throw new Error("No valid numeric data found. Check your columns or missing cell values.");
  }

  // Feature names mapping (handles expansion of categorical one-hot features)
  const processedFeatureNames: string[] = [];
  featureCols.forEach(col => {
    const colIdx = headers.indexOf(col.name);
    if (col.dataType === "categorical") {
      const cats = categoricalValues[colIdx] || [];
      cats.forEach(cat => {
        processedFeatureNames.push(`${col.name}_${cat}`);
      });
    } else {
      processedFeatureNames.push(col.name);
    }
  });

  // Calculate means and standard deviations for Z-score normalization of numeric features
  const numProcessedFeatures = X[0].length;
  const means: number[] = new Array(numProcessedFeatures).fill(0);
  const stds: number[] = new Array(numProcessedFeatures).fill(0);

  // Compute means
  for (let c = 0; c < numProcessedFeatures; c++) {
    let sum = 0;
    for (let r = 0; r < X.length; r++) {
      sum += X[r][c];
    }
    means[c] = sum / X.length;
  }

  // Compute standard deviations
  for (let c = 0; c < numProcessedFeatures; c++) {
    let varianceSum = 0;
    for (let r = 0; r < X.length; r++) {
      const diff = X[r][c] - means[c];
      varianceSum += diff * diff;
    }
    const variance = varianceSum / X.length;
    stds[c] = Math.sqrt(variance) || 1; // prevent division by zero
  }

  // Check if we should normalize: keep categorical features unnormalized (already 0 or 1), normalize numeric
  // Determine which processed feature index is categorical vs numeric
  const isProcessedFeatureCategorical: boolean[] = [];
  let colIdxOffset = 0;
  featureCols.forEach(col => {
    const colIdx = headers.indexOf(col.name);
    if (col.dataType === "categorical") {
      const cats = categoricalValues[colIdx] || [];
      cats.forEach(() => {
        isProcessedFeatureCategorical.push(true);
      });
    } else {
      isProcessedFeatureCategorical.push(false);
    }
  });

  // Normalize X
  const XNorm = X.map(row => {
    return row.map((val, c) => {
      if (isProcessedFeatureCategorical[c]) {
        return val; // categorical one-hot values are already 0 or 1, don't normalize
      }
      return (val - means[c]) / stds[c];
    });
  });

  // Normalize target y if regression
  let yMean = 0;
  let yStd = 1;
  let yNorm = y;

  if (!isClassification) {
    let sum = 0;
    for (let r = 0; r < y.length; r++) {
      sum += y[r][0];
    }
    yMean = sum / y.length;

    let varianceSum = 0;
    for (let r = 0; r < y.length; r++) {
      const diff = y[r][0] - yMean;
      varianceSum += diff * diff;
    }
    yStd = Math.sqrt(varianceSum / y.length) || 1;

    yNorm = y.map(val => [(val[0] - yMean) / yStd]);
  }

  // Train / Test Split (80% / 20%)
  const indices = Array.from({ length: X.length }, (_, i) => i);
  // Simple deterministic shuffle to keep results reproducible and stable
  for (let i = indices.length - 1; i > 0; i--) {
    const j = (i * 97) % indices.length;
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }

  const splitIdx = Math.floor(X.length * 0.8) || 1;
  const trainIndices = indices.slice(0, splitIdx);
  const testIndices = indices.slice(splitIdx);

  const prep = {
    xtr: trainIndices.map(idx => XNorm[idx]),
    ytr: trainIndices.map(idx => yNorm[idx]),
    xte: testIndices.map(idx => XNorm[idx]),
    yte: testIndices.map(idx => yNorm[idx]),
    rawXte: testIndices.map(idx => X[idx]),
    rawYte: testIndices.map(idx => y[idx])
  };

  return {
    X: XNorm,
    y: yNorm,
    rawX: X,
    rawY: y,
    prep,
    isClassification,
    featureNames: processedFeatureNames,
    targetCategories,
    yMean,
    yStd,
    stats: {
      totalSamples: X.length,
      trainSamples: prep.xtr.length,
      valSamples: prep.xte.length,
      inputDim: numProcessedFeatures,
      outputDim: isClassification ? targetCategories.length : 1
    }
  };
}
