import { SpreadsheetData } from "../types";

export interface PreloadedDataset {
  name: string;
  description: string;
  data: SpreadsheetData;
  defaultFeatures: string[];
  defaultTarget: string;
}

export const PRELOADED_DATASETS: PreloadedDataset[] = [
  {
    name: "Iris Flowers (Classification)",
    description: "Predict the species of Iris flower based on sepal and petal dimensions. Classic 3-class classification problem.",
    defaultFeatures: ["SepalLength", "SepalWidth", "PetalLength", "PetalWidth"],
    defaultTarget: "Species",
    data: {
      headers: ["SepalLength", "SepalWidth", "PetalLength", "PetalWidth", "Species"],
      rows: [
        ["5.1", "3.5", "1.4", "0.2", "Setosa"],
        ["4.9", "3.0", "1.4", "0.2", "Setosa"],
        ["4.7", "3.2", "1.3", "0.2", "Setosa"],
        ["4.6", "3.1", "1.5", "0.2", "Setosa"],
        ["5.0", "3.6", "1.4", "0.2", "Setosa"],
        ["5.4", "3.9", "1.7", "0.4", "Setosa"],
        ["4.6", "3.4", "1.4", "0.3", "Setosa"],
        ["5.0", "3.4", "1.5", "0.2", "Setosa"],
        ["4.4", "2.9", "1.4", "0.2", "Setosa"],
        ["4.9", "3.1", "1.5", "0.1", "Setosa"],
        ["5.4", "3.7", "1.5", "0.2", "Setosa"],
        ["4.8", "3.4", "1.6", "0.2", "Setosa"],
        ["4.8", "3.0", "1.4", "0.1", "Setosa"],
        ["4.3", "3.0", "1.1", "0.1", "Setosa"],
        ["5.8", "4.0", "1.2", "0.2", "Setosa"],
        ["5.7", "4.4", "1.5", "0.4", "Setosa"],
        ["5.4", "3.9", "1.3", "0.4", "Setosa"],
        ["5.1", "3.5", "1.4", "0.3", "Setosa"],
        ["5.7", "2.8", "4.5", "1.3", "Versicolor"],
        ["6.3", "3.3", "4.7", "1.6", "Versicolor"],
        ["4.9", "2.4", "3.3", "1.0", "Versicolor"],
        ["6.6", "2.9", "4.6", "1.3", "Versicolor"],
        ["5.2", "2.7", "3.9", "1.4", "Versicolor"],
        ["5.0", "2.0", "3.5", "1.0", "Versicolor"],
        ["5.9", "3.0", "4.2", "1.5", "Versicolor"],
        ["6.0", "2.2", "4.0", "1.0", "Versicolor"],
        ["6.1", "2.9", "4.7", "1.4", "Versicolor"],
        ["5.6", "2.9", "3.6", "1.3", "Versicolor"],
        ["6.7", "3.1", "4.4", "1.4", "Versicolor"],
        ["5.6", "3.0", "4.5", "1.5", "Versicolor"],
        ["5.8", "2.7", "4.1", "1.0", "Versicolor"],
        ["6.2", "2.2", "4.5", "1.5", "Versicolor"],
        ["5.6", "2.5", "3.9", "1.1", "Versicolor"],
        ["5.9", "3.2", "4.8", "1.8", "Versicolor"],
        ["6.1", "2.8", "4.0", "1.3", "Versicolor"],
        ["6.3", "2.5", "4.9", "1.5", "Versicolor"],
        ["6.1", "3.0", "4.6", "1.4", "Versicolor"],
        ["6.4", "2.8", "5.6", "2.1", "Virginica"],
        ["7.2", "3.0", "5.8", "1.6", "Virginica"],
        ["7.4", "2.8", "6.1", "1.9", "Virginica"],
        ["7.9", "3.8", "6.4", "2.0", "Virginica"],
        ["6.4", "2.8", "5.6", "2.2", "Virginica"],
        ["6.3", "2.8", "5.1", "1.5", "Virginica"],
        ["6.1", "2.6", "5.6", "1.4", "Virginica"],
        ["7.7", "3.0", "6.1", "2.3", "Virginica"],
        ["6.3", "3.4", "5.6", "2.4", "Virginica"],
        ["6.4", "3.1", "5.5", "1.8", "Virginica"],
        ["6.0", "3.0", "4.8", "1.8", "Virginica"],
        ["6.9", "3.1", "5.4", "2.1", "Virginica"],
        ["6.7", "3.1", "5.6", "2.4", "Virginica"],
        ["6.9", "3.1", "5.1", "2.3", "Virginica"],
        ["5.8", "2.7", "5.1", "1.9", "Virginica"],
        ["6.8", "3.2", "5.9", "2.3", "Virginica"],
        ["6.7", "3.3", "5.7", "2.5", "Virginica"],
        ["6.7", "3.0", "5.2", "2.3", "Virginica"],
        ["6.3", "2.5", "5.0", "1.9", "Virginica"]
      ]
    }
  },
  {
    name: "Real Estate Valuation (Regression)",
    description: "Estimate local property listing values based on square footage, room count, home age, and garage capacity.",
    defaultFeatures: ["AreaSqFt", "Bedrooms", "Bathrooms", "AgeYears", "HasGarage"],
    defaultTarget: "PriceUSD",
    data: {
      headers: ["AreaSqFt", "Bedrooms", "Bathrooms", "AgeYears", "HasGarage", "PriceUSD"],
      rows: [
        ["1200", "2", "1.5", "15", "Yes", "195000"],
        ["1500", "3", "2.0", "10", "Yes", "245000"],
        ["850", "1", "1.0", "30", "No", "125000"],
        ["2200", "4", "2.5", "5", "Yes", "385000"],
        ["1800", "3", "2.0", "8", "Yes", "295000"],
        ["1350", "3", "1.5", "20", "No", "185000"],
        ["3100", "5", "3.5", "2", "Yes", "520000"],
        ["1100", "2", "1.0", "25", "No", "155000"],
        ["1650", "3", "2.0", "12", "Yes", "260000"],
        ["2000", "4", "2.5", "6", "Yes", "340000"],
        ["2500", "4", "3.0", "4", "Yes", "410000"],
        ["950", "2", "1.0", "40", "No", "130000"],
        ["1750", "3", "2.0", "11", "Yes", "275000"],
        ["1400", "2", "1.5", "18", "No", "178000"],
        ["2800", "4", "3.0", "3", "Yes", "465000"],
        ["1250", "3", "1.5", "22", "Yes", "190000"],
        ["1900", "3", "2.5", "7", "Yes", "315000"],
        ["1600", "3", "2.0", "14", "Yes", "235000"],
        ["2100", "4", "2.5", "9", "No", "305000"],
        ["1050", "2", "1.0", "28", "No", "148000"],
        ["2300", "4", "2.5", "5", "Yes", "365000"],
        ["1450", "3", "2.0", "16", "Yes", "215000"]
      ]
    }
  },
  {
    name: "Wine Quality Profiler",
    description: "Classify wine status (Premium vs. Standard) using chemical metrics like acidity levels, residual sugar, and alcohol volume.",
    defaultFeatures: ["Acidity", "CitricAcid", "ResidualSugar", "pH", "Alcohol"],
    defaultTarget: "Status",
    data: {
      headers: ["Acidity", "CitricAcid", "ResidualSugar", "pH", "Alcohol", "Status"],
      rows: [
        ["7.4", "0.00", "1.9", "3.51", "9.4", "Standard"],
        ["7.8", "0.04", "2.3", "3.20", "9.8", "Standard"],
        ["7.8", "0.04", "2.3", "3.26", "9.8", "Standard"],
        ["11.2", "0.56", "1.9", "3.16", "9.8", "Premium"],
        ["7.4", "0.00", "1.9", "3.51", "9.4", "Standard"],
        ["7.4", "0.00", "2.1", "3.51", "9.4", "Standard"],
        ["7.9", "0.06", "1.6", "3.30", "9.4", "Standard"],
        ["7.3", "0.00", "1.2", "3.39", "10.0", "Premium"],
        ["7.8", "0.02", "2.0", "3.36", "9.5", "Standard"],
        ["7.5", "0.36", "6.1", "3.35", "10.5", "Premium"],
        ["6.7", "0.08", "1.8", "3.44", "10.1", "Premium"],
        ["7.5", "0.36", "6.1", "3.35", "10.5", "Premium"],
        ["5.6", "0.00", "1.6", "3.58", "9.9", "Standard"],
        ["7.4", "0.29", "1.6", "3.58", "9.1", "Standard"],
        ["8.9", "0.29", "3.8", "3.23", "10.5", "Premium"],
        ["8.9", "0.19", "3.9", "3.17", "10.5", "Premium"],
        ["8.5", "0.28", "1.8", "3.30", "10.5", "Premium"],
        ["8.1", "0.28", "1.8", "3.30", "10.5", "Premium"],
        ["7.4", "0.08", "4.4", "3.38", "9.0", "Standard"],
        ["7.9", "0.14", "1.8", "3.38", "9.8", "Standard"],
        ["8.9", "0.48", "1.8", "3.39", "9.4", "Standard"],
        ["7.8", "0.31", "5.6", "3.52", "10.8", "Premium"],
        ["7.9", "0.21", "1.8", "3.39", "9.5", "Standard"]
      ]
    }
  }
];

// Helper to parse a standard CSV string into structured headers and rows
export function parseCSV(csvText: string): SpreadsheetData {
  const lines = csvText.split(/\r?\n/);
  const rows: string[][] = [];
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser supporting quotes (does not support nested commas in quotes for brevity)
    const cells = line.split(",").map(cell => {
      let trimmed = cell.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = trimmed.substring(1, trimmed.length - 1);
      }
      return trimmed;
    });

    if (headers.length === 0) {
      headers = cells.map((cell, idx) => cell || `Col_${idx + 1}`);
    } else {
      // Ensure row cell count matches header
      while (cells.length < headers.length) {
        cells.push("");
      }
      rows.push(cells.slice(0, headers.length));
    }
  }

  if (headers.length === 0) {
    throw new Error("Invalid or empty CSV file.");
  }

  return { headers, rows };
}

// Convert dataset grid back to CSV string
export function exportToCSV(data: SpreadsheetData): string {
  const csvRows = [data.headers.join(",")];
  data.rows.forEach(row => {
    csvRows.push(row.map(val => (val.includes(",") ? `"${val}"` : val)).join(","));
  });
  return csvRows.join("\n");
}
