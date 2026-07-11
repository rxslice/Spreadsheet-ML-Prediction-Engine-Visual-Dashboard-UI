import React, { useState } from "react";
import { Play, Pause, RotateCcw, LineChart, TrendingUp, BarChart2, CheckCircle2, ChevronRight } from "lucide-react";
import { TrainingMetric, TrainingState, Connection } from "../types";

interface DashboardProps {
  trainingState: TrainingState;
  onStartTraining: () => void;
  onPauseTraining: () => void;
  onResetModel: () => void;
  onStepTraining: () => void;
  featureImportances: { name: string; score: number }[];
  predictions: { actual: string; predicted: string; inputs: number[] }[];
  outputType: "regression" | "classification";
  epochs: number;
  onEpochsChange: (val: number) => void;
}

export default function Dashboard({
  trainingState,
  onStartTraining,
  onPauseTraining,
  onResetModel,
  onStepTraining,
  featureImportances,
  predictions,
  outputType,
  epochs,
  onEpochsChange
}: DashboardProps) {
  const [activeSection, setActiveTab] = useState<"metrics" | "diagnostics">("metrics");

  const latestMetric = trainingState.history[trainingState.history.length - 1];
  const currentTrainLoss = latestMetric ? latestMetric.trainLoss : 0;
  const currentValLoss = latestMetric ? latestMetric.valLoss : 0;

  // Custom responsive SVG line chart drawer for Loss History
  const renderLossChart = () => {
    const history = trainingState.history;
    if (history.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-[#0c0e12] rounded-2xl border border-white/5 p-4">
          <LineChart className="w-8 h-8 text-slate-700 animate-pulse mb-2" />
          <p className="text-slate-500 text-xs font-sans">
            Start training model to plot loss history curves
          </p>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = { top: 15, right: 15, bottom: 25, left: 45 };

    const maxLoss = Math.max(
      ...history.map(h => Math.max(h.trainLoss, h.valLoss))
    ) || 1;

    const minLoss = 0;
    const maxEpochs = Math.max(epochs, history.length);

    // Compute coordinate points
    const getX = (epoch: number) => {
      const scale = (width - padding.left - padding.right) / maxEpochs;
      return padding.left + epoch * scale;
    };

    const getY = (loss: number) => {
      const drawableHeight = height - padding.top - padding.bottom;
      const scale = drawableHeight / maxLoss;
      return height - padding.bottom - loss * scale;
    };

    // Generate Path points strings
    let trainPath = "";
    let valPath = "";

    history.forEach((h, idx) => {
      const x = getX(h.epoch);
      const yTrain = getY(h.trainLoss);
      const yVal = getY(h.valLoss);

      if (idx === 0) {
        trainPath = `M ${x} ${yTrain}`;
        valPath = `M ${x} ${yVal}`;
      } else {
        trainPath += ` L ${x} ${yTrain}`;
        valPath += ` L ${x} ${yVal}`;
      }
    });

    // Horizontal helper grid lines count
    const numGridLines = 4;
    const gridYValues = Array.from(
      { length: numGridLines },
      (_, idx) => (maxLoss / (numGridLines - 1)) * idx
    );

    return (
      <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 text-xs font-sans">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Training Epoch Cost (Loss Curves)</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-purple-400 font-semibold font-mono text-[10px]">
              <span className="w-2 h-2 bg-purple-500 rounded-full inline-block" />
              Train: {currentTrainLoss.toFixed(4)}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[10px]">
              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
              Validation: {currentValLoss.toFixed(4)}
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {/* Horizontal grid lines */}
          {gridYValues.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  fill="#475569"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Epoch labels */}
          {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => {
            if (idx < 0 || idx >= history.length) return null;
            const h = history[idx];
            const x = getX(h.epoch);
            return (
              <text
                key={idx}
                x={x}
                y={height - 8}
                fill="#475569"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="center"
              >
                E{h.epoch}
              </text>
            );
          })}

          {/* Core Paths */}
          {history.length > 1 && (
            <>
              {/* Training Loss Line */}
              <path
                d={trainPath}
                fill="none"
                stroke="#a855f7" // purple-500
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Validation Loss Line */}
              <path
                d={valPath}
                fill="none"
                stroke="#10b981" // emerald-500
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col h-full shadow-2xl">
      {/* Control Station Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400 glow-cyan" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
            Training & Diagnostics
          </h2>
        </div>

        {/* Tab selection */}
        <div className="flex bg-black/30 p-1 border border-white/5 rounded-xl text-xs font-medium font-sans">
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "metrics"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSection === "diagnostics"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Diagnostics
          </button>
        </div>
      </div>

      {/* Model Training Statistics Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center font-sans">
        <div className="bg-black/40 border border-white/5 rounded-2xl p-3">
          <p className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
            Epoch Progress
          </p>
          <p className="text-lg font-bold text-cyan-400 font-mono mt-1">
            {trainingState.epoch} / {epochs}
          </p>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-2xl p-3">
          <p className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
            Current Loss
          </p>
          <p className="text-lg font-bold text-purple-400 font-mono mt-1">
            {currentTrainLoss ? currentTrainLoss.toFixed(4) : "0.0000"}
          </p>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-2xl p-3">
          <p className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
            {outputType === "classification" ? "Accuracy" : "R-Squared"}
          </p>
          <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
            {trainingState.accuracy !== undefined
              ? `${(trainingState.accuracy * 100).toFixed(1)}%`
              : "0.0%"}
          </p>
        </div>
      </div>

      {/* Primary Training controls buttons */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-3">
          {trainingState.running ? (
            <button
              onClick={onPauseTraining}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 font-medium py-2.5 rounded-xl border border-amber-500/30 transition-all text-xs font-sans cursor-pointer h-10"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : (
            <button
              onClick={onStartTraining}
              className="flex-1 flex items-center justify-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-semibold py-2.5 rounded-xl border border-cyan-500/40 transition-all text-xs font-sans cursor-pointer h-10 glow-cyan"
            >
              <Play className="w-4 h-4" />
              Train Model
            </button>
          )}

          <button
            onClick={onStepTraining}
            disabled={trainingState.running}
            className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 font-medium px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all text-xs font-sans disabled:opacity-30 disabled:pointer-events-none cursor-pointer h-10"
            title="Step training by 1 single epoch"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
            Step
          </button>

          <button
            onClick={onResetModel}
            className="p-2.5 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl border border-white/10 hover:border-rose-500/20 transition-all cursor-pointer h-10 w-10 flex items-center justify-center"
            title="Reset model weights & biases"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Max Epoch Limit slider */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border border-white/5 bg-black/40 rounded-2xl text-xs font-sans">
          <span className="text-slate-400 font-medium">Max Epoch Limit:</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={epochs}
              onChange={(e) => onEpochsChange(parseInt(e.target.value))}
              disabled={trainingState.running}
              className="w-32 accent-cyan-500 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            />
            <span className="font-mono text-slate-200 font-semibold w-12 text-right">
              {epochs}
            </span>
          </div>
        </div>
      </div>

      {activeSection === "metrics" ? (
        /* TRAINING LOSS HISTORIES */
        <div className="flex-1 space-y-4 overflow-y-auto">
          {renderLossChart()}
        </div>
      ) : (
        /* TARGET PREDICTIONS & FEATURE IMPORTANCE TAB */
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Feature Importance panel */}
          {featureImportances.length > 0 && (
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-sans space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <BarChart2 className="w-4 h-4 text-purple-400 glow-purple" />
                <span>Feature Importance (Contribution Weights)</span>
              </div>
              <div className="space-y-2">
                {featureImportances.map((f) => (
                  <div key={f.name} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-slate-300 font-semibold">{f.name}</span>
                      <span className="text-purple-400 font-mono font-bold">
                        {f.score.toFixed(1)}%
                      </span>
                    </div>
                    {/* Progress score bar */}
                    <div className="w-full bg-[#0c0e12] rounded-full h-2 border border-white/5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${f.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model test indices predictions */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-sans space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 glow-emerald" />
              <span>Model Test Predictions (Side-by-Side)</span>
            </div>
            {predictions.length === 0 ? (
              <p className="text-slate-500 text-xs font-sans py-2 leading-relaxed">
                Predictions will appear here during neural network model testing.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 font-mono text-[10px]">
                <div className="flex items-center justify-between font-bold border-b border-white/5 pb-1.5 text-slate-400 font-sans">
                  <span>Actual value</span>
                  <span>Predicted Value</span>
                </div>
                {predictions.slice(0, 10).map((pred, idx) => {
                  const isMatch = outputType === "classification" 
                    ? pred.actual === pred.predicted
                    : Math.abs(parseFloat(pred.actual) - parseFloat(pred.predicted)) < 0.15;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 border-b border-white/5"
                    >
                      <span className="text-slate-300 font-semibold">{pred.actual}</span>
                      <span
                        className={`font-semibold ${
                          isMatch ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {pred.predicted}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
