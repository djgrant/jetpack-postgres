module.exports = {
  maxConcurrency: 1,
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      tsconfig: "test/tsconfig.json",
    },
  },
};
