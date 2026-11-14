import React, { useState, useEffect, useRef } from "react";
import { PRELOADED_DATASETS, PreloadedDataset } from "./utils/datasets";
import { NeuralNetwork, preprocessDataset } from "./utils/math";
import { SpreadsheetData, ColumnSchema, NetworkConfig, TrainingMetric, TrainingState, ColumnType, DataType } from "./types";
import Spreadsheet from "./components/Spreadsheet";
import NetworkVisualizer from "./components/NetworkVisualizer";
import Dashboard from "./components/Dashboard";
import { Cpu, Info, Zap, Sparkles } from "lucide-react";

export default function App() {
  // Preloaded Dataset Selection
  const [selectedDatasetIdx, setSelectedDatasetIdx] = useState<number>(0);
  const currentDataset = PRELOADED_DATASETS[selectedDatasetIdx];

  // Active Grid Data & Column Schema State
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>(currentDataset.data);
  const [columnSchema, setColumnSchema] = useState<ColumnSchema[]>(() => {
    return currentDataset.data.headers.map((header) => {
      const isFeature = currentDataset.defaultFeatures.includes(header);
      const isTarget = currentDataset.defaultTarget === header;
      const isCategorical = header === "Species" || header === "HasGarage" || header === "Status";

      return {
        name: header,
        type: (isTarget ? "target" : isFeature ? "feature" : "ignored") as ColumnType,
        dataType: (isCategorical ? "categorical" : "numeric") as DataType
      };
    });
  });

  // Neural Network Architecture Config State
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    hiddenLayers: [{ neurons: 4 }, { neurons: 3 }],
    learningRate: 0.05,
    epochs: 400,
    batchSize: 4,
    outputType: "classification"
  });

  // Active Neural Network Instantiation State
  const [neuralNet, setNeuralNet] = useState<NeuralNetwork | null>(null);
  
  // Training Progress, metrics, and diagnostics state
  const [trainingState, setTrainingState] = useState<TrainingState>({
    epoch: 0,
    running: false,
    history: []
  });

  // Diagnostics items (predictions list & feature importance array)
  const [featureImportances, setFeatureImportances] = useState<{ name: string; score: number }[]>([]);
  const [testPredictions, setTestPredictions] = useState<{ actual: string; predicted: string; inputs: number[] }[]>([]);

  // Refs for tracking model details across fast render animation frames
  const modelRef = useRef<NeuralNetwork | null>(null);
  const prepRef = useRef<any>(null);

  // Sync state when preloaded dataset selection switches
  const handleDatasetSelect = (idx: number) => {
    setSelectedDatasetIdx(idx);
    const d = PRELOADED_DATASETS[idx];
    setSpreadsheetData(d.data);

    const initialSchema = d.data.headers.map((header) => {
      const isFeature = d.defaultFeatures.includes(header);
      const isTarget = d.defaultTarget === header;
      const isCategorical = header === "Species" || header === "HasGarage" || header === "Status";

      return {
        name: header,
        type: (isTarget ? "target" : isFeature ? "feature" : "ignored") as ColumnType,
        dataType: (isCategorical ? "categorical" : "numeric") as DataType
      };
    });

    setColumnSchema(initialSchema);
    resetModel(d.data, initialSchema);
  };

  const handleResetToDefault = () => {
    handleDatasetSelect(selectedDatasetIdx);
  };

  // Build / Reset the neural network from active dataset schema
  const resetModel = (
    currentData: SpreadsheetData = spreadsheetData,
    currentSchema: ColumnSchema[] = columnSchema
  ) => {
    setTrainingState({
      epoch: 0,
      running: false,
      history: []
    });
    setTestPredictions([]);

    try {
      // Preprocess dataset splits and normalize
      const parsedInfo = preprocessDataset(currentData.headers, currentData.rows, currentSchema);
      prepRef.current = parsedInfo;

      // Update network configuration outputType based on target column
      const isClass = parsedInfo.isClassification;
      setNetworkConfig(prev => ({
        ...configRef.current,
        outputType: isClass ? "classification" : "regression"
      }));

      // Create new network model weights instance
      const net = new NeuralNetwork(
        parsedInfo.stats.inputDim,
        configRef.current.hiddenLayers.map(l => l.neurons),
        parsedInfo.stats.outputDim,
        isClass ? "classification" : "regression",
        parsedInfo.targetCategories
      );

      modelRef.current = net;
      setNeuralNet(net);

      // Compute initial feature importance
      const importances = net.calculateFeatureImportance(parsedInfo.featureNames);
      setFeatureImportances(importances);
    } catch (err: any) {
      modelRef.current = null;
      setNeuralNet(null);
      setFeatureImportances([]);
    }
  };

  // Track config reference to prevent stale closure weights in intervals
  const configRef = useRef(networkConfig);
  useEffect(() => {
    configRef.current = networkConfig;
  }, [networkConfig]);

  // Handle auto-rebuild model when column schema or spreadsheet row counts change
  useEffect(() => {
    resetModel();
    // Depend on the row data itself: an edited cell must rebuild the model,
    // not only a change in the number of rows.
  }, [columnSchema, spreadsheetData.headers, spreadsheetData.rows]);

  // Run a single training epoch step
  const executeTrainingEpoch = () => {
    const net = modelRef.current;
    const info = prepRef.current;

    if (!net || !info) return false;

    const { xtr, ytr, xte, yte } = info.prep;
    const numSamples = xtr.length;

    // Stochastic / Mini-batch gradient descent indices partition
    const indices = Array.from({ length: numSamples }, (_, i) => i);
    // Shuffle indices for batch gradient updates
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    let epochTrainLossSum = 0;
    const batchSize = Math.max(1, Math.floor(configRef.current.batchSize) || 1);

    // Mini-batch gradient descent: one averaged update per batch
    for (let start = 0; start < numSamples; start += batchSize) {
      const batch = indices.slice(start, start + batchSize);
      const result = net.trainBatch(
        batch.map(i => xtr[i]),
        batch.map(i => ytr[i]),
        configRef.current.learningRate
      );
      epochTrainLossSum += result.loss * batch.length;
    }

    const averageTrainLoss = epochTrainLossSum / numSamples;

    // Evaluate on Validation / Test Set
    let epochValLossSum = 0;
    let correctCount = 0;

    const currentPredictions = xte.map((xSample: number[], testIdx: number) => {
      const { activations } = net.forward(xSample);
      const output = activations[activations.length - 1];
      const targetVal = yte[testIdx];

      // Calculate sample validation loss
      if (net.outputType === "classification") {
        const targetIdx = targetVal.indexOf(1);
        const prob = output[targetIdx >= 0 ? targetIdx : 0] || 1e-15;
        epochValLossSum += -Math.log(Math.max(1e-15, prob));

        // Evaluate prediction accuracy
        const predIdx = output.indexOf(Math.max(...output));
        if (predIdx === targetIdx) {
          correctCount++;
        }

        return {
          actual: info.targetCategories[targetIdx] || `Class ${targetIdx}`,
          predicted: info.targetCategories[predIdx] || `Class ${predIdx}`,
          inputs: info.prep.rawXte[testIdx]
        };
      } else {
        const error = output[0] - targetVal[0];
        epochValLossSum += 0.5 * error * error;

        // Un-normalize continuous values for realistic display
        const actualUnnorm = targetVal[0] * info.yStd + info.yMean;
        const predUnnorm = output[0] * info.yStd + info.yMean;

        return {
          actual: actualUnnorm.toFixed(1),
          predicted: predUnnorm.toFixed(1),
          inputs: info.prep.rawXte[testIdx]
        };
      }
    });

    const averageValLoss = xte.length > 0 ? epochValLossSum / xte.length : 0;
    const accuracy = net.outputType === "classification"
      ? (xte.length > 0 ? correctCount / xte.length : 0)
      : (xte.length > 0 ? calculateRSquared(info.prep.rawYte.map((v: any) => v[0]), currentPredictions.map((p: any) => parseFloat(p.predicted))) : 0);

    // Append to metric logs history
    setTrainingState(prev => {
      const nextEpoch = prev.epoch + 1;
      const newHistory = [
        ...prev.history,
        { epoch: nextEpoch, trainLoss: averageTrainLoss, valLoss: averageValLoss }
      ];

      return {
        epoch: nextEpoch,
        running: nextEpoch < configRef.current.epochs && prev.running,
        history: newHistory,
        accuracy
      };
    });

    setTestPredictions(currentPredictions);

    // Refresh dynamic weights visualizer connections periodically
    if (trainingState.epoch % 5 === 0) {
      setNeuralNet({ ...net } as NeuralNetwork);
      const importances = net.calculateFeatureImportance(info.featureNames);
      setFeatureImportances(importances);
    }

    return trainingState.epoch + 1 < configRef.current.epochs;
  };

  // Helper: calculate Coefficient of Determination (R-Squared) for continuous targets
  const calculateRSquared = (actuals: number[], predictedVals: number[]): number => {
    const meanActual = actuals.reduce((s, x) => s + x, 0) / actuals.length;
    let totalSumSq = 0;
    let residualSumSq = 0;

    for (let i = 0; i < actuals.length; i++) {
      const diffMean = actuals[i] - meanActual;
      const diffPred = actuals[i] - predictedVals[i];
      totalSumSq += diffMean * diffMean;
      residualSumSq += diffPred * diffPred;
    }

    if (totalSumSq === 0) return 0;
    return Math.max(0, 1 - residualSumSq / totalSumSq);
  };

  // Core High-Performance RequestAnimationFrame Async training ticker loops
  useEffect(() => {
    if (!trainingState.running) return;

    let active = true;
    const runBatch = () => {
      if (!active) return;

      // Run 8 epochs in a single frame tick to make training super responsive, satisfying, and quick!
      let hasMore = true;
      for (let i = 0; i < 8; i++) {
        hasMore = executeTrainingEpoch();
        if (!hasMore) break;
      }

      if (hasMore && active) {
        requestAnimationFrame(runBatch);
      } else {
        setTrainingState(prev => ({ ...prev, running: false }));
      }
    };

    requestAnimationFrame(runBatch);

    return () => {
      active = false;
    };
  }, [trainingState.running]);

  const startTraining = () => {
    if (!neuralNet) {
      alert("Neural network model is not initialized yet. Ensure column schemas are complete.");
      return;
    }
    setTrainingState(prev => ({ ...prev, running: true }));
  };

  const pauseTraining = () => {
    setTrainingState(prev => ({ ...prev, running: false }));
  };

  const stepTraining = () => {
    executeTrainingEpoch();
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-300 flex flex-col font-sans atmospheric-bg">
      {/* Universal Workspace Margin Branding Area */}
      <header className="px-8 h-16 border-b border-white/5 flex items-center justify-between glass-panel z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center glow-cyan">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Forge Spreadsheet ML</span>
            <span className="text-[10px] opacity-50 uppercase tracking-wider font-mono">In-Browser Neural Engine</span>
          </div>
        </div>

        {/* High-Fidelity Dataset Preloader select option list */}
        <div className="flex items-center gap-6 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-sans font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Select Dataset:
            </span>
            <div className="flex bg-black/40 p-1 border border-white/5 rounded-lg text-xs font-medium">
              {PRELOADED_DATASETS.map((d, idx) => (
                <button
                  key={d.name}
                  onClick={() => handleDatasetSelect(idx)}
                  className={`px-3 py-1 rounded-md cursor-pointer transition-all duration-200 text-[11px] uppercase tracking-wider ${
                    selectedDatasetIdx === idx
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {d.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block"></div>
          <div className="hidden md:flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-sans text-[10px] uppercase font-semibold">ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout with 2-Column Bento Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column: Spreadsheet Editor Panel */}
        <div className="xl:col-span-7 flex flex-col h-full min-h-[500px]">
          <Spreadsheet
            data={spreadsheetData}
            schema={columnSchema}
            onDataChange={setSpreadsheetData}
            onSchemaChange={setColumnSchema}
            onResetToDefault={handleResetToDefault}
          />
        </div>

        {/* Right Column: Model Topology Builder & Training Statistics Panel */}
        <div className="xl:col-span-5 flex flex-col gap-6 h-full overflow-y-auto">
          {/* Top Panel: Interactive architecture graph */}
          <div className="flex-1 min-h-[360px]">
            <NetworkVisualizer
              config={networkConfig}
              neuralNet={neuralNet}
              onConfigChange={setNetworkConfig}
              inputNames={prepRef.current?.featureNames || []}
              outputNames={
                networkConfig.outputType === "classification"
                  ? prepRef.current?.targetCategories || []
                  : ["Prediction (Y)"]
              }
            />
          </div>

          {/* Bottom Panel: Live Training statistics and diagnostics dashboard */}
          <div className="flex-1 min-h-[320px]">
            <Dashboard
              trainingState={trainingState}
              onStartTraining={startTraining}
              onPauseTraining={pauseTraining}
              onResetModel={() => resetModel()}
              onStepTraining={stepTraining}
              featureImportances={featureImportances}
              predictions={testPredictions}
              outputType={networkConfig.outputType}
              epochs={networkConfig.epochs}
              onEpochsChange={(val) => setNetworkConfig(prev => ({ ...prev, epochs: val }))}
            />
          </div>
        </div>
      </main>

      {/* Bottom informational status bar */}
      <footer className="px-8 h-12 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-wide glass-panel">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-500" />
          <span className="text-slate-400 font-sans">Activation: Tanh (hidden) | Softmax / Linear (output)</span>
        </div>
        <div className="flex items-center gap-4 font-sans text-slate-500">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" /> GPU optimized
          </span>
          <span>© 2026 Forge. Mathematical computations run client-side.</span>
        </div>
      </footer>
    </div>
  );

}
