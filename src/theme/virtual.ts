import { createRegExp, exactly, oneOrMore, word } from 'magic-regexp'
import type { PinceauVirtualContext, ThemeGenerationOutput } from '../types'

const resolveIdRegex = createRegExp(exactly('pinceau.').and(oneOrMore(word).as('extension')))
const virtualModuleRegex = createRegExp(exactly('virtual:pinceau.').and(oneOrMore(word).as('extension')))

export default function usePinceauVirtualStore(): PinceauVirtualContext {
  const outputs: ThemeGenerationOutput['outputs'] = {}

  function updateOutputs(generatedTheme: ThemeGenerationOutput) {
    Object.entries(generatedTheme.outputs).forEach(
      ([key, value]) => {
        outputs[key] = value
      },
    )
  }

  function getOutput(id: string) {
    const matchId = virtualModuleRegex.exec(id)
    if (matchId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ext] = matchId
      return outputs[ext]
    }
  }

  /**
   * Resolves the virtual module id from an import like `pinceau.css` or `pinceau.ts`
   */
  function getOutputId(id: string) {
    const matchId = resolveIdRegex.exec(id)
    if (matchId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ext] = matchId
      return `virtual:pinceau.${ext}`
    }
  }

  return {
    get outputs() {
      return outputs
    },
    updateOutputs,
    getOutput,
    getOutputId,
  }
}