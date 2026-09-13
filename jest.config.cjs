module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/release/'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node10',
          ignoreDeprecations: '6.0',
          verbatimModuleSyntax: false,
          isolatedModules: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
