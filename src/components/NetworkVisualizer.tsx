import React, { useRef, useEffect, useState } from "react";
import { Plus, Minus, Cpu, Settings, Activity } from "lucide-react";
import { NetworkConfig, LayerConfig } from "../types";
import { NeuralNetwork } from "../utils/math";

interface NetworkVisualizerProps {
  config: NetworkConfig;
  neuralNet: NeuralNetwork | null;
  onConfigChange: (newConfig: NetworkConfig) => void;
  inputNames: string[];
  outputNames: string[];
}

export default function NetworkVisualizer({
  config,
  neuralNet,
  onConfigChange,
  inputNames,
  outputNames
}: NetworkVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 350 });

  // Handle Container resizing dynamically
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(300, width),
          height: Math.max(250, height)
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Hidden Layer controls
  const addHiddenLayer = () => {
    if (config.hiddenLayers.length >= 4) return; // Limit to 4 hidden layers for clean visualization
    const newLayers = [...config.hiddenLayers, { neurons: 4 }];
    onConfigChange({ ...config, hiddenLayers: newLayers });
  };

  const removeHiddenLayer = () => {
    if (config.hiddenLayers.length === 0) return;
    const newLayers = config.hiddenLayers.slice(0, -1);
    onConfigChange({ ...config, hiddenLayers: newLayers });
  };

  const updateNeuronsInLayer = (idx: number, count: number) => {
    const val = Math.max(1, Math.min(10, count)); // limit neurons per hidden layer to [1, 10]
    const newLayers = config.hiddenLayers.map((layer, lIdx) => {
      if (lIdx !== idx) return layer;
      return { ...layer, neurons: val };
    });
    onConfigChange({ ...config, hiddenLayers: newLayers });
  };

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Structure layer node counts
    const layers = [
      inputNames.length || 1,
      ...config.hiddenLayers.map(l => l.neurons),
      outputNames.length || 1
    ];

    const layerSpacing = dimensions.width / (layers.length + 0.3);
    const startX = layerSpacing * 0.65;

    // Build lists of coordinates for nodes in each layer
    const nodes: { x: number; y: number; label: string }[][] = [];

    for (let l = 0; l < layers.length; l++) {
      const nodeCount = layers[l];
      const x = startX + l * layerSpacing;
      
      const layerNodes: { x: number; y: number; label: string }[] = [];
      const isInput = l === 0;
      const isOutput = l === layers.length - 1;

      // Add extra margin for layout
      const verticalPadding = 30;
      const drawableHeight = dimensions.height - verticalPadding * 2;
      const nodeSpacing = nodeCount > 1 ? drawableHeight / (nodeCount - 1) : drawableHeight;
      const startY = nodeCount > 1 ? verticalPadding : verticalPadding + drawableHeight / 2;

      for (let n = 0; n < nodeCount; n++) {
        const y = startY + n * nodeSpacing;
        let label = "";
        if (isInput) {
          label = inputNames[n] || `In ${n + 1}`;
        } else if (isOutput) {
          label = outputNames[n] || `Out ${n + 1}`;
        } else {
          label = `H${l}_${n + 1}`;
        }
        layerNodes.push({ x, y, label });
      }
      nodes.push(layerNodes);
    }

    // Draw synapses/connections with colors representing weights
    if (neuralNet && neuralNet.layers && neuralNet.layers.length === config.hiddenLayers.length + 1) {
      for (let l = 0; l < neuralNet.layers.length; l++) {
        const currLayer = neuralNet.layers[l];
        const prevNodes = nodes[l];
        const currNodes = nodes[l + 1];

        if (!currLayer || !prevNodes || !currNodes) continue;

        for (let nextN = 0; nextN < currLayer.weights.length; nextN++) {
          const nextNode = currNodes[nextN];
          if (!nextNode) continue;

          for (let prevN = 0; prevN < currLayer.weights[nextN].length; prevN++) {
            const prevNode = prevNodes[prevN];
            if (!prevNode) continue;

            const w = currLayer.weights[nextN][prevN];
            if (w === undefined) continue;

            // Draw line
            ctx.beginPath();
            ctx.moveTo(prevNode.x, prevNode.y);
            ctx.lineTo(nextNode.x, nextNode.y);

            // Green/Blue for positive weight, Red/Orange for negative weight
            const alpha = Math.min(1.0, Math.max(0.12, Math.abs(w) * 0.7));
            if (w > 0) {
              ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`; // emerald
            } else {
              ctx.strokeStyle = `rgba(248, 113, 113, ${alpha})`; // red
            }

            ctx.lineWidth = Math.min(4.5, 0.4 + Math.abs(w) * 1.5);
            ctx.stroke();
          }
        }
      }
    } else {
      // Draw simple static dotted synapses if model is not built yet
      for (let l = 0; l < nodes.length - 1; l++) {
        const currentNodes = nodes[l];
        const nextNodes = nodes[l + 1];
        ctx.strokeStyle = "rgba(71, 85, 105, 0.2)"; // slate-600 low alpha
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);

        for (let i = 0; i < currentNodes.length; i++) {
          for (let j = 0; j < nextNodes.length; j++) {
            ctx.beginPath();
            ctx.moveTo(currentNodes[i].x, currentNodes[i].y);
            ctx.lineTo(nextNodes[j].x, nextNodes[j].y);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]); // clear dash
      }
    }

    // Draw neurons/circles
    for (let l = 0; l < nodes.length; l++) {
      const isInput = l === 0;
      const isOutput = l === nodes.length - 1;

      for (let n = 0; n < nodes[l].length; n++) {
        const node = nodes[l][n];

        // Highlight layer types
        ctx.beginPath();
        ctx.arc(node.x, node.y, isInput || isOutput ? 14 : 11, 0, 2 * Math.PI);

        if (isInput) {
          ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
          ctx.strokeStyle = "#06b6d4";
        } else if (isOutput) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
          ctx.strokeStyle = "#10b981";
        } else {
          ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
          ctx.strokeStyle = "#8b5cf6";
        }

        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        // Label names
        ctx.fillStyle = "#f1f5f9"; // slate-100
        ctx.font = isInput || isOutput ? "10px sans-serif" : "9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (isInput) {
          // Draw label on left
          ctx.textAlign = "right";
          ctx.fillText(node.label, node.x - 22, node.y);
        } else if (isOutput) {
          // Draw label on right
          ctx.textAlign = "left";
          ctx.fillText(node.label, node.x + 22, node.y);
        } else {
          // Draw mini label inside
          ctx.fillText(`H${l}`, node.x, node.y);
        }
      }
    }
  }, [dimensions, config, neuralNet, inputNames, outputNames]);

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col h-full shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400 glow-purple" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
            Network Architecture Builder
          </h2>
        </div>

        {/* Dynamic Topology Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs font-sans">
            Hidden Layers ({config.hiddenLayers.length}):
          </span>
          <div className="flex bg-black/30 p-0.5 rounded-xl border border-white/5">
            <button
              onClick={removeHiddenLayer}
              disabled={config.hiddenLayers.length === 0}
              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Remove hidden layer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={addHiddenLayer}
              disabled={config.hiddenLayers.length >= 4}
              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Add hidden layer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Layer Neurons count controls */}
      {config.hiddenLayers.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 py-2 px-3 border border-purple-500/20 bg-purple-500/5 rounded-2xl mb-4 text-xs font-sans">
          <span className="text-purple-300 font-medium">Neuron Config:</span>
          {config.hiddenLayers.map((layer, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-[10px]">L{idx + 1}:</span>
              <div className="flex items-center bg-black/40 px-1.5 py-0.5 border border-white/5 rounded-lg">
                <button
                  onClick={() => updateNeuronsInLayer(idx, layer.neurons - 1)}
                  className="p-0.5 text-slate-500 hover:text-slate-200 cursor-pointer"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="w-6 text-center text-slate-200 font-semibold font-mono text-[10px]">
                  {layer.neurons}
                </span>
                <button
                  onClick={() => updateNeuronsInLayer(idx, layer.neurons + 1)}
                  className="p-0.5 text-slate-500 hover:text-slate-200 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Topology Diagram Stage */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[220px] bg-[#0c0e12] rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0"
        />
        {neuralNet && (
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-black/60 border border-white/5 px-2.5 py-1.5 rounded-full text-[10px] text-slate-300 font-mono glow-emerald">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Feed-Forward Weights Model</span>
          </div>
        )}
      </div>

      {/* Network Learning settings inputs */}
      <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-sans">
        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Learning Rate:</label>
          <select
            value={config.learningRate}
            onChange={(e) => onConfigChange({ ...config, learningRate: parseFloat(e.target.value) })}
            className="w-full bg-black/40 border border-white/5 text-slate-200 px-3 py-2.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="0.001">0.001 (Slow)</option>
            <option value="0.01">0.01 (Standard)</option>
            <option value="0.05">0.05 (Fast)</option>
            <option value="0.1">0.10 (Aggressive)</option>
            <option value="0.2">0.20 (Maximum)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Batch Size:</label>
          <select
            value={config.batchSize}
            onChange={(e) => onConfigChange({ ...config, batchSize: parseInt(e.target.value) })}
            className="w-full bg-black/40 border border-white/5 text-slate-200 px-3 py-2.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="1">1 (Stochastic)</option>
            <option value="4">4 (Mini-batch)</option>
            <option value="8">8 (Balanced)</option>
            <option value="16">16 (Stable)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
