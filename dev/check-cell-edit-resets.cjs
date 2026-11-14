// Browser check for ML-2: editing a cell must rebuild the model.
// Usage: npm run build && node dev/check-cell-edit-resets.cjs
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const epoch = async () => (await page.locator("text=Epoch Progress").locator("..").locator("p").nth(1).innerText()).split("/")[0].trim();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /Step/ }).click();
  const before = await epoch();
  await page.locator("tbody td.cursor-text").first().click();
  const input = page.locator("tbody td input");
  await input.fill("9.9");
  await input.press("Enter");
  await page.waitForTimeout(200);
  const after = await epoch();
  await browser.close(); server.close();
  console.log(JSON.stringify({ before, after, errors }));
  if (before !== "3" || after !== "0" || errors.length) process.exit(1);
});
