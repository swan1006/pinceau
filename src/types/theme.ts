import type { GeneratedPinceauPaths, GeneratedPinceauTheme, theme } from '#pinceau/theme'
import type { GeneratedPinceauUtils } from '#pinceau/utils'

export type PinceauTheme = GeneratedPinceauTheme

export type PinceauTokensPaths = GeneratedPinceauPaths

export type PinceauUtils = GeneratedPinceauUtils

// @ts-ignore - Might be undefined
export type PinceauMediaQueries = 'dark' | 'light' | 'initial' | keyof (typeof theme.media)
