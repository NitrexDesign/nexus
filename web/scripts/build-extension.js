const fs = require("fs");
const path = require("path");

const SOURCE_DIR = path.join(__dirname, "..", "out");
const EXTENSION_DIR = path.join(__dirname, "..", "extension");

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory not found: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destName = entry.name === "_next" ? "next" : entry.name;
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      if (entry.name !== "_not-found" && !entry.name.startsWith("_")) {
        copyDir(srcPath, destPath);
      } else if (entry.name === "_next") {
        copyDir(srcPath, destPath);
      }
    } else if (entry.isFile()) {
      if (
        !entry.name.startsWith("_") &&
        entry.name !== ".DS_Store" &&
        entry.name !== "index.txt"
      ) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function processHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processHtmlFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      let content = fs.readFileSync(fullPath, "utf8");

      const cspMeta =
        "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *; font-src 'self' data:;\">";
      content = content.replace("<head>", `<head>\n  ${cspMeta}`);

      content = content.replace(/\/_next\//g, "/next/");

      const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;

      content = content.replace(scriptPattern, (fullScript, scriptContent) => {
        const trimmed = scriptContent.trim();
        if (trimmed && !trimmed.startsWith("<!")) {
          return `<script>${trimmed}</script>`;
        }
        return "";
      });

      fs.writeFileSync(fullPath, content);
    }
  }
}

function updateManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.chrome_url_overrides = { newtab: "index.html" };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function buildExtension() {
  console.log("Building Chrome extension...");

  cleanDir(EXTENSION_DIR);

  copyDir(SOURCE_DIR, EXTENSION_DIR);

  processHtmlFiles(EXTENSION_DIR);

  updateManifest(path.join(EXTENSION_DIR, "manifest.json"));

  const files = fs.readdirSync(EXTENSION_DIR);
  console.log(`Extension built in: ${EXTENSION_DIR}`);
  console.log(`Files: ${files.join(", ")}`);
}

buildExtension();
