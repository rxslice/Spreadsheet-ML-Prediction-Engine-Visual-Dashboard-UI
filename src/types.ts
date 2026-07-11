export type ColumnType = "feature" | "target" | "ignored";
export type DataType = "numeric" | "categorical";

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  dataType: DataType;
  categories?: string[]; // unique values if categorical
}

export interface SpreadsheetData {
  headers: string[];
  rows: string[][]; // raw string values
}

export interface LayerConfig {
  neurons: number;
}

export interface NetworkConfig {
  hiddenLayers: LayerConfig[];
  learningRate: number;
  epochs: number;
  batchSize: number;
  outputType: "regression" | "classification";
}

export interface TrainingMetric {
  epoch: number;
  trainLoss: number;
  valLoss: number;
}

export interface TrainingState {
  epoch: number;
  running: boolean;
  history: TrainingMetric[];
  accuracy?: number; // classification accuracy or R-squared
}

export interface Connection {
  from: { x: number; y: number; layerIdx: number; neuronIdx: number };
  to: { x: number; y: number; layerIdx: number; neuronIdx: number };
  weight: number;
}

export interface NeuronNode {
  x: number;
  y: number;
  layerIdx: number;
  neuronIdx: number;
  label: string;
  activation?: number;
}
