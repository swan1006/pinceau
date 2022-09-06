import type { Core as Instance } from 'style-dictionary-esm'
import StyleDictionary from 'style-dictionary-esm'
import type { PinceauTheme, PinceauTokens, ThemeGenerationOutput } from '../types'
import { referencesRegex, resolveVariableFromPath, walkTokens } from '../utils'
import { jsFull, tsFull, tsTypesDeclaration } from './formats'

export async function generateTheme(tokens: PinceauTheme, buildPath: string, silent = true): Promise<ThemeGenerationOutput> {
  let styleDictionary: Instance = StyleDictionary

  // Tokens outputs as in-memory objects
  const outputs: ThemeGenerationOutput['outputs'] = {
    // Aliased tokens detected (a token which only uses an alias as a value)
    aliases: {},
  }

  // Tokens processed through dictionary
  let transformedTokens: PinceauTokens
  let transformedTokensTyping: any

  // Cleanup default fileHeader
  styleDictionary.fileHeader = {}

  // Prepare tokens, and walk them once
  styleDictionary.registerAction({
    name: 'prepare',
    do: (dictionary) => {
      transformedTokens = walkTokens(
        dictionary.tokens,
        (token) => {
          // Resolve aliased properties
          const keyRegex = /{(.*)}/g
          const hasReference = token?.original?.value?.match(referencesRegex) || false
          const reference = token.name
          if (hasReference?.[0] && hasReference[0] === token.original.value) {
            token.value = (token.original.value as string).replace(
              keyRegex,
              (_, tokenPath) => {
                outputs.aliases[reference] = resolveVariableFromPath(tokenPath)
                return outputs.aliases[reference]
              },
            )
          }
          return token
        },
      )
      transformedTokensTyping = walkTokens(
        dictionary.tokens,
        () => {
          return 'DesignToken'
        },
      )
    },
    undo: () => {
      //
    },
  })

  // Add `variable` key to attributes
  styleDictionary.registerTransform({
    name: 'pinceau/variable',
    type: 'attribute',
    matcher: () => true,
    transformer(token) {
      return {
        variable: `var(--${token.name})`,
      }
    },
  })

  // Replace dashed by dotted
  styleDictionary.registerTransform({
    name: 'pinceau/name',
    type: 'name',
    matcher: () => true,
    transformer(token) {
      return token.name.replaceAll('-', '.')
    },
  })

  // Transform group used accross all tokens formats
  styleDictionary.registerTransformGroup({
    name: 'pinceau',
    transforms: ['name/cti/kebab', 'size/px', 'color/hex', 'pinceau/variable'],
  })

  // pinceau.d.ts
  styleDictionary.registerFormat({
    name: 'pinceau/types',
    formatter() {
      return tsTypesDeclaration(transformedTokensTyping)
    },
  })

  // pinceau.css
  styleDictionary.registerFormat({
    name: 'pinceau/css',
    formatter({ dictionary, options }) {
      const selector = options.selector ? options.selector : ':root'
      const { outputReferences } = options
      const { formattedVariables } = StyleDictionary.formatHelpers
      dictionary.allTokens = dictionary.allTokens.filter(token => !outputs.aliases[token.name])
      const css = `${selector} {\n${formattedVariables({ format: 'css', dictionary, outputReferences })}\n}\n`
      outputs.css = css
      return css
    },
  })

  // pinceau.json
  styleDictionary.registerFormat({
    name: 'pinceau/json',
    formatter({ dictionary: { allTokens } }) {
      const json = `{\n${allTokens.map((token) => {
        return `  "${token.name}": ${JSON.stringify(token.value)}`
      }).join(',\n')}\n}`
      outputs.json = json
      return json
    },
  })

  // pinceau.ts
  styleDictionary.registerFormat({
    name: 'pinceau/typescript',
    formatter() {
      const ts = tsFull(transformedTokens, outputs.aliases)
      outputs.ts = ts
      return ts
    },
  })

  // pinceau.js
  styleDictionary.registerFormat({
    name: 'pinceau/javascript',
    formatter() {
      const js = jsFull(transformedTokens, outputs.aliases)
      outputs.js = js
      return js
    },
  })

  styleDictionary = styleDictionary.extend({
    tokens: tokens as any,
    platforms: {
      prepare: {
        transformGroup: 'pinceau',
        actions: ['prepare'],
      },

      ts: {
        transformGroup: 'pinceau',
        buildPath,
        files: [
          {
            destination: 'index.css',
            format: 'pinceau/css',
          },
          {
            destination: 'index.d.ts',
            format: 'pinceau/types',
          },
          {
            destination: 'index.ts',
            format: 'pinceau/typescript',
          },
          {
            destination: 'index.js',
            format: 'pinceau/javascript',
          },
        ],
      },

      done: {
        transformGroup: 'pinceau',
        actions: ['done'],
      },
    },
  })

  const result = await new Promise<ThemeGenerationOutput>(
    (resolve, reject) => {
      try {
        // Actions run at the end of build, helps on awaiting it properly
        if (silent) {
          styleDictionary.logger().pause()
        }

        styleDictionary.registerAction({
          name: 'done',
          do: () => {
            resolve({
              tokens: transformedTokens as PinceauTheme,
              outputs,
              buildPath,
            })
          },
          undo: () => {
          //
          },
        })

        styleDictionary.cleanAllPlatforms()

        styleDictionary.buildAllPlatforms()
      }
      catch (e) {
        reject(e)
      }
    },
  ).then((result) => {
    // Actions run at the end of build, helps on awaiting it properly
    if (silent) {
      styleDictionary.logger().pause()
    }

    return result
  })

  return result
}
