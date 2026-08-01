import JavaScriptObfuscator from 'javascript-obfuscator'

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
}

function obfuscateBundle(options = {}) {
  const merged = { ...OBFUSCATOR_OPTIONS, ...options }
  return {
    name: 'obfuscate-bundle',
    enforce: 'post',
    apply: 'build',
    generateBundle(_outputOptions, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !fileName.endsWith('.js')) continue
        const result = JavaScriptObfuscator.obfuscate(chunk.code, merged)
        bundle[fileName].code = result.getObfuscatedCode()
      }
    },
  }
}

export { obfuscateBundle }
