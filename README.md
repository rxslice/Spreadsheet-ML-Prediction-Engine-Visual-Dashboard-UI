# Forge Spreadsheet ML

An in-browser teaching tool: edit a dataset in a spreadsheet, choose feature and target columns, configure a small neural network, and watch it train epoch by epoch with live loss curves, test-set predictions and feature importance.

Everything runs locally in the browser. There is no server, no API key and no data upload.

## What it does

- **Datasets:** preloaded examples (Iris classification and regression sets) or your own CSV. Cells are editable, and any edit rebuilds the model.
- **Preprocessing:** one-hot encoding for categorical columns; z-score scaling fitted on the training split only, so test rows never leak into the scaler. 80/20 deterministic train/test split.
- **Model:** fully connected network with tanh hidden layers, softmax with cross-entropy for classification and linear output with MSE for regression. Mini-batch gradient descent with momentum; the batch-size control sets how many samples are averaged into each update.
- **Insight:** loss curves, accuracy or error on the test split, network diagram, and Garson feature importance.

It is designed for learning how training works on small tables. It is not a production modelling tool.

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Checks

```bash
npm test           # unit tests: preprocessing leakage, mini-batch updates
npm run lint       # TypeScript type check
npm run build
node dev/check-cell-edit-resets.cjs   # browser check, needs Playwright; run after build
```
