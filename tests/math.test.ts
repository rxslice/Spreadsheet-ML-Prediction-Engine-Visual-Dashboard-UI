import { describe, expect, it } from "vitest";
import { NeuralNetwork, preprocessDataset } from "../src/utils/math";
import type { ColumnSchema } from "../src/types";

const schema: ColumnSchema[] = [
  { name: "x", type: "feature", dataType: "numeric" },
  { name: "y", type: "target", dataType: "numeric" },
];

function rowsWithOutlierInTest(n = 20) {
  const rows = Array.from({ length: n }, (_, i) => [String(i), String(i * 2)]);
  const probe = preprocessDataset(["x", "y"], rows, schema);
  // Find a row that the split puts in the test set and make it an extreme outlier.
  const testRaw = probe.prep.rawXte[0][0];
  rows[testRaw] = ["1000000", "2000000"];
  return rows;
}

describe("preprocessDataset (ML-1: no test-set leakage)", () => {
  it("fits normalization on the training split only", () => {
    const rows = rowsWithOutlierInTest();
    const out = preprocessDataset(["x", "y"], rows, schema);
    const trainX = out.prep.xtr.map(r => r[0]);
    const mean = trainX.reduce((a, b) => a + b, 0) / trainX.length;
    const variance = trainX.reduce((a, b) => a + (b - mean) ** 2, 0) / trainX.length;
    // Standardized with train statistics, the training features have mean 0 and std 1.
    expect(mean).toBeCloseTo(0, 6);
    expect(Math.sqrt(variance)).toBeCloseTo(1, 6);
    // The regression target scaler is also fitted on train rows, so the outlier
    // (a test row) cannot shift it.
    const trainY = out.prep.ytr.map(r => r[0]);
    expect(trainY.reduce((a, b) => a + b, 0) / trainY.length).toBeCloseTo(0, 6);
    expect(out.yMean).toBeLessThan(1000);
  });

  it("keeps train and test disjoint and complete", () => {
    const rows = Array.from({ length: 23 }, (_, i) => [String(i), String(i)]);
    const out = preprocessDataset(["x", "y"], rows, schema);
    const seen = [...out.prep.rawXte.map(r => r[0])];
    expect(out.prep.xtr.length + out.prep.xte.length).toBe(23);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("NeuralNetwork.trainBatch (ML-3: batch size is honoured)", () => {
  function twin() {
    const a = new NeuralNetwork(2, [3], 1, "regression");
    const b = new NeuralNetwork(2, [3], 1, "regression");
    b.layers = JSON.parse(JSON.stringify(a.layers));
    return [a, b];
  }

  it("applies one averaged update per batch, not one per sample", () => {
    const xs = [[1, 0], [0, 1], [1, 1], [-1, 0.5]];
    const ys = [[1], [-1], [0.5], [2]];
    const [batched, single] = twin();
    batched.trainBatch(xs, ys, 0.1);
    // Four per-sample updates must differ from one batch update.
    for (let i = 0; i < xs.length; i++) single.trainBatch([xs[i]], [ys[i]], 0.1);
    expect(batched.layers[0].weights).not.toEqual(single.layers[0].weights);
  });

  it("a batch of identical samples equals one update on that sample", () => {
    const [a, b] = twin();
    a.trainBatch([[0.3, -0.2], [0.3, -0.2]], [[1], [1]], 0.1);
    b.trainBatch([[0.3, -0.2]], [[1]], 0.1);
    a.layers.forEach((l, i) =>
      l.weights.forEach((row, n) =>
        row.forEach((w, k) => expect(w).toBeCloseTo(b.layers[i].weights[n][k], 12))));
  });
});
