const path = require("path");
const rollup = require("rollup");
const typescript = require("rollup-plugin-typescript2");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const replaceAsync = require("string-replace-async");

const dirname = path.resolve(__dirname, "../db/plv8");
const tsconfig = path.join(dirname, "tsconfig.build.json");

const plugins = [
  nodeResolve({ resolveOnly: ["@djgrant/jetpack"] }),
  typescript({ tsconfig }),
];

async function compileFile(filePath) {
  const bundle = await rollup.rollup({ input: filePath, plugins });
  const { output } = await bundle.generate({ format: "iife", name: "module" });
  await bundle.close();
  return output[0].code;
}

module.exports = function sqlWithTsImport(sql) {
  const IMPORT_TS_RE = /:import_ts\(['"](.+)['"]\)/gm;
  return replaceAsync(sql, IMPORT_TS_RE, async (_, fileName) => {
    const filePath = path.resolve(dirname, fileName + ".ts");
    const code = await compileFile(filePath);
    return `${code}\n return module();`;
  });
};
