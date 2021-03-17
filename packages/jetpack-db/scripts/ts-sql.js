const path = require("path");
const rollup = require("rollup");
const typescript = require("rollup-plugin-typescript2");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const replaceAsync = require("string-replace-async");

const projectDir = path.resolve(__dirname, "../../../");
const packageDir = path.resolve(__dirname, "../");
const srcDir = path.resolve(packageDir, "src");
const tsconfig = path.resolve(packageDir, "tsconfig.build.json");

const plugins = [
  nodeResolve({
    resolveOnly: ["@djgrant/jetpack"],
    modulesOnly: true,
    rootDir: projectDir,
  }),
  typescript({
    cwd: projectDir,
    tsconfig,
  }),
];

async function compileFile(filePath) {
  const bundle = await rollup.rollup({ input: filePath, plugins });
  const { output } = await bundle.generate({ format: "iife", name: "module" });
  await bundle.close();
  return output[0].code;
}

module.exports = function sqlWithTsImport(sql) {
  const IMPORT_TS_RE = /:import_ts\(['"](.+)['"]\);?/gm;
  return replaceAsync(sql, IMPORT_TS_RE, async (_, fileName) => {
    const filePath = path.resolve(srcDir, fileName + ".ts");
    const code = await compileFile(filePath);
    return `${code}\n return module();`;
  });
};
