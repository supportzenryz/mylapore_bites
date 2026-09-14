/** ts-jest runs CommonJS, but source uses NodeNext ".js" specifiers. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testRegex: ".*\\.(spec|test)\\.ts$",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { module: "CommonJS", moduleResolution: "Node", esModuleInterop: true, experimentalDecorators: true, emitDecoratorMetadata: true, target: "ES2022", strict: true } }],
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.module.ts", "!src/main.ts", "!src/worker.ts"],
  testTimeout: 30000,
};
