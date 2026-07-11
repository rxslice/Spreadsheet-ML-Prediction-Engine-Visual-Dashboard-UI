import React, { useState, useRef } from "react";
import { Plus, Trash2, Upload, Download, Settings, RefreshCw, Layers } from "lucide-react";
import { SpreadsheetData, ColumnSchema, ColumnType, DataType } from "../types";
import { parseCSV, exportToCSV } from "../utils/datasets";

interface SpreadsheetProps {
  data: SpreadsheetData;
  schema: ColumnSchema[];
  onDataChange: (newData: SpreadsheetData) => void;
  onSchemaChange: (newSchema: ColumnSchema[]) => void;
  onResetToDefault: () => void;
}

export default function Spreadsheet({
  data,
  schema,
  onDataChange,
  onSchemaChange,
  onResetToDefault
}: SpreadsheetProps) {
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "schema">("data");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cell Edit Actions
  const startEditing = (rIdx: number, cIdx: number, currentVal: string) => {
    setEditingCell({ r: rIdx, c: cIdx });
    setEditValue(currentVal);
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    const newRows = data.rows.map((row, rIdx) => {
      if (rIdx !== editingCell.r) return row;
      return row.map((cell, cIdx) => (cIdx === editingCell.c ? editValue : cell));
    });
    onDataChange({ ...data, rows: newRows });
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveCellEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Add / Delete Row Actions
  const addRow = () => {
    const emptyRow = new Array(data.headers.length).fill("0.0");
    onDataChange({ ...data, rows: [...data.rows, emptyRow] });
  };

  const deleteRow = (rIdx: number) => {
    if (data.rows.length <= 1) return;
    const newRows = data.rows.filter((_, idx) => idx !== rIdx);
    onDataChange({ ...data, rows: newRows });
  };

  // Drag-and-Drop and File Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        
        // Auto-initialize schema for parsed CSV
        const initialSchema: ColumnSchema[] = parsed.headers.map((header, idx) => {
          // Guess data type based on first few rows
          let isCategorical = false;
          for (let r = 0; r < Math.min(5, parsed.rows.length); r++) {
            const val = parsed.rows[r][idx];
            if (val && isNaN(Number(val))) {
              isCategorical = true;
              break;
            }
          }

          return {
            name: header,
            type: (idx === parsed.headers.length - 1 ? "target" : "feature") as ColumnType,
            dataType: (isCategorical ? "categorical" : "numeric") as DataType
          };
        });

        onDataChange(parsed);
        onSchemaChange(initialSchema);
      } catch (err: any) {
        alert(err.message || "Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const downloadCSV = () => {
    const csvContent = exportToCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "forge_dataset.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Schema Configuration
  const toggleColumnType = (headerName: string) => {
    const newSchema = schema.map(col => {
      if (col.name !== headerName) return col;
      let nextType: ColumnType = "ignored";
      if (col.type === "feature") nextType = "target";
      else if (col.type === "target") nextType = "ignored";
      else nextType = "feature";

      // If making this column a target, set other columns that are currently "target" to "feature"
      return { ...col, type: nextType };
    });

    // Ensure only one target
    const finalSchema = newSchema.map(col => {
      if (col.name === headerName && col.type === "target") {
        return col; // keep newly selected target
      }
      if (col.name !== headerName && col.type === "target" && newSchema.some(c => c.name === headerName && c.type === "target")) {
        return { ...col, type: "feature" as ColumnType }; // demote previous target to feature
      }
      return col;
    });

    onSchemaChange(finalSchema);
  };

  const toggleDataType = (headerName: string) => {
    const finalSchema = schema.map(col => {
      if (col.name !== headerName) return col;
      return {
        ...col,
        dataType: (col.dataType === "numeric" ? "categorical" : "numeric") as DataType
      };
    });
    onSchemaChange(finalSchema);
  };

  return (
    <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Spreadsheet Header Control Panel */}
      <div className="p-5 border-b border-white/5 bg-black/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-cyan-400 glow-cyan" />
          <h2 id="spreadsheet-title" className="text-sm font-bold uppercase tracking-wider text-white font-sans">
            Data Forge Editor
          </h2>
          <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs px-2.5 py-1 rounded-full font-mono glow-cyan">
            {data.rows.length} rows × {data.headers.length} cols
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selection */}
          <div className="flex bg-black/30 p-1 border border-white/5 rounded-xl mr-2">
            <button
              onClick={() => setActiveTab("data")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "data"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Spreadsheet
            </button>
            <button
              onClick={() => setActiveTab("schema")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "schema"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Schema Settings
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all font-sans cursor-pointer h-9"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Upload CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />

          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all font-sans cursor-pointer h-9"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>

          <button
            onClick={onResetToDefault}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer h-9 w-9 flex items-center justify-center"
            title="Reset to default dataset"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {activeTab === "data" ? (
        /* SPREADSHEET GRID VIEW */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 overflow-auto relative min-h-[300px] transition-colors duration-200 ${
            isDragOver ? "bg-indigo-950/20" : ""
          }`}
        >
          {/* File drag overlays */}
          {isDragOver && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/80 border-2 border-dashed border-indigo-500 rounded-xl m-4 pointer-events-none">
              <Upload className="w-12 h-12 text-indigo-400 animate-bounce mb-3" />
              <p className="text-indigo-200 text-base font-medium font-sans">
                Drop your CSV file here to import!
              </p>
              <p className="text-indigo-400 text-xs mt-1 font-mono">
                Headers will automatically be parsed & mapped
              </p>
            </div>
          )}

          <table className="w-full border-collapse font-mono text-xs select-none">
            <thead>
              <tr className="sticky top-0 bg-[#0c0e12] border-b border-white/5 z-10">
                <th className="w-12 px-3 py-3 border-r border-white/5 bg-[#0c0e12] text-slate-500 font-sans font-medium text-center">
                  #
                </th>
                {data.headers.map((header, cIdx) => {
                  const colSchema = schema.find(c => c.name === header);
                  const isFeature = colSchema?.type === "feature";
                  const isTarget = colSchema?.type === "target";

                  return (
                    <th
                      key={header}
                      className="px-4 py-3 text-left border-r border-white/5 font-sans min-w-[150px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-medium tracking-wide truncate">
                          {header}
                        </span>
                        {/* Interactive column role pill */}
                        <button
                          onClick={() => toggleColumnType(header)}
                          className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold border tracking-wider transition-all cursor-pointer ${
                            isFeature
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 glow-purple"
                              : isTarget
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 glow-emerald"
                              : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
                          }`}
                          title="Click to toggle column role: Feature (X) -> Target (y) -> Ignored"
                        >
                          {colSchema?.type === "feature"
                            ? "Input (X)"
                            : colSchema?.type === "target"
                            ? "Target (y)"
                            : "Ignored"}
                        </button>
                      </div>
                      {/* Secondary Info: column type */}
                      {colSchema && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 font-sans">
                          <span
                            onClick={() => toggleDataType(header)}
                            className="hover:text-slate-300 transition-colors cursor-pointer capitalize underline decoration-dotted decoration-white/10"
                            title="Click to toggle data type: Numeric <-> Categorical"
                          >
                            {colSchema.dataType}
                          </span>
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="w-12 px-3 py-3 text-center bg-[#0c0e12] text-slate-500 font-sans font-medium">
                  Act
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center text-slate-500 border-r border-white/5 bg-black/20 font-sans text-xs">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => {
                    const colSchema = schema.find(c => c.name === data.headers[cIdx]);
                    const isFeature = colSchema?.type === "feature";
                    const isTarget = colSchema?.type === "target";

                    return (
                      <td
                        key={cIdx}
                        onClick={() => startEditing(rIdx, cIdx, cell)}
                        className={`px-4 py-2.5 border-r border-white/5 cursor-text transition-all ${
                          editingCell?.r === rIdx && editingCell?.c === cIdx
                            ? "p-0 bg-[#161a22]"
                            : isFeature
                            ? "text-purple-300 font-mono bg-purple-500/5 hover:bg-purple-500/10"
                            : isTarget
                            ? "text-emerald-300 font-mono bg-emerald-500/5 hover:bg-emerald-500/10"
                            : "text-slate-500 font-mono bg-black/10"
                        }`}
                      >
                        {editingCell?.r === rIdx && editingCell?.c === cIdx ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={handleCellKeyDown}
                            className="w-full h-full px-4 py-2.5 bg-[#161a22] text-slate-100 font-mono text-xs border-0 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate block max-w-[200px]">
                            {cell || <span className="text-slate-600 italic">null</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-0 text-center">
                    <button
                      onClick={() => deleteRow(rIdx)}
                      className="p-2.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer w-full flex items-center justify-center h-full hover:bg-rose-500/10"
                      title="Delete this row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Row Button at end of table */}
          <div className="p-4 flex justify-start sticky left-0">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all font-sans tracking-wide shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Add Row
            </button>
          </div>
        </div>
      ) : (
        /* SCHEMA CONFIGURATION VIEW */
        <div className="flex-1 p-6 overflow-auto bg-black/10">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border border-white/5 bg-black/40 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-sans">
                Schema Mappings
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Map each column's role in the neural network model. Inputs (X) are continuous features or categorical categories which will be one-hot encoded automatically. Targets (y) are regression variables or class prediction species.
              </p>
            </div>

            <div className="space-y-3">
              {schema.map((col) => {
                const isFeature = col.type === "feature";
                const isTarget = col.type === "target";

                return (
                  <div
                    key={col.name}
                    className={`flex flex-wrap items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
                      isFeature
                        ? "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/30 shadow-sm"
                        : isTarget
                        ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30 shadow-sm"
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 font-sans">
                        {col.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Raw values: {Array.from(new Set(data.rows.map(r => r[data.headers.indexOf(col.name)]).filter(Boolean))).slice(0, 3).join(", ")}...
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* DataType Selection */}
                      <div className="flex rounded-xl border border-white/5 p-0.5 bg-black/40">
                        <button
                          onClick={() => {
                            const updated = schema.map(c => c.name === col.name ? { ...c, dataType: "numeric" as DataType } : c);
                            onSchemaChange(updated);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            col.dataType === "numeric"
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Numeric
                        </button>
                        <button
                          onClick={() => {
                            const updated = schema.map(c => c.name === col.name ? { ...c, dataType: "categorical" as DataType } : c);
                            onSchemaChange(updated);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            col.dataType === "categorical"
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Categorical
                        </button>
                      </div>

                      {/* Column Role Selection */}
                      <div className="flex rounded-xl border border-white/5 p-0.5 bg-black/40">
                        <button
                          onClick={() => {
                            const updated = schema.map(c => c.name === col.name ? { ...c, type: "feature" as ColumnType } : c);
                            onSchemaChange(updated);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            col.type === "feature"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold glow-purple"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Input (X)
                        </button>
                        <button
                          onClick={() => toggleColumnType(col.name)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            col.type === "target"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold glow-emerald"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Target (y)
                        </button>
                        <button
                          onClick={() => {
                            const updated = schema.map(c => c.name === col.name ? { ...c, type: "ignored" as ColumnType } : c);
                            onSchemaChange(updated);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                            col.type === "ignored"
                              ? "bg-white/10 text-slate-300 font-semibold"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
