"use client"

import { useEffect, useRef, useState } from "react"
import { EditorView, keymap, highlightActiveLine, Decoration, ViewPlugin, ViewUpdate, WidgetType, lineNumbers } from "@codemirror/view"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { tags as t } from "@lezer/highlight"
import { EditorState, StateEffect, StateField } from "@codemirror/state"
import { useTheme } from "next-themes"
import { defaultKeymap } from "@codemirror/commands"
import { highlightSelectionMatches } from "@codemirror/search"
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language"

interface EditorProps {
  code: string
  language?: "python" | "javascript" | "typescript"
  onChange: (code: string) => void
  currentLine?: number
  variables?: Record<string, unknown>
}

// Custom theme matching our UI
const getTheme = (isDark: boolean) => {
  return EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "transparent",
      color: "var(--foreground)",
    },
    ".cm-content": {
      padding: "0",
      fontSize: "14px",
      fontFamily: "var(--font-mono)",
      lineHeight: "1.6",
      caretColor: isDark ? "var(--foreground)" : "var(--primary)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--muted-foreground)",
      border: "none",
      paddingRight: "1rem",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--primary)",
    },
    ".cm-line": {
      paddingLeft: "0.5rem",
    },
    ".cm-activeLine": {
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.05)",
      borderRadius: "4px",
    },
    ".cm-selectionMatch": {
      backgroundColor: isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.2)",
    },
    ".cm-cursor": {
      borderLeftColor: isDark ? "var(--foreground)" : "var(--primary)",
      borderLeftWidth: "2px",
    },
    ".cm-scroller": {
      height: "100%",
      overflow: "auto",
      paddingTop: "1.5rem",
      paddingBottom: "1.5rem",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-line-highlight": {
      backgroundColor: isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(56, 189, 248, 0.1)",
      borderLeft: "3px solid var(--primary)",
      transition: "all 0.2s ease-in-out",
    },
    
    // Autocomplete Tooltip Styling
    ".cm-tooltip": {
      backgroundColor: "var(--popover) !important",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      color: "var(--popover-foreground)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
      fontFamily: "var(--font-mono)",
      fontSize: "13px",
      maxHeight: "300px",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
      padding: "6px 8px",
      lineHeight: "1.4",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    ".cm-completionLabel": {
      fontWeight: "500",
    },
    ".cm-completionDetail": {
      fontStyle: "italic",
      opacity: "0.5",
      marginLeft: "8px",
    },
    ".cm-completionIcon": {
      marginRight: "8px",
      opacity: "0.7",
    },
    ".cm-completionIcon-function, .cm-completionIcon-method": {
      "&:after": { content: "'ƒ'" },
      color: "var(--primary)",
    },
    ".cm-completionIcon-class": {
      "&:after": { content: "'○'" },
      color: "#e5c07b",
    },
    ".cm-completionIcon-interface": {
      "&:after": { content: "'◌'" },
      color: "#98c379",
    },
    ".cm-completionIcon-variable": {
      "&:after": { content: "'𝑥'" },
      color: "#61afef",
    },
    ".cm-completionIcon-constant": {
      "&:after": { content: "'C'" },
      color: "#d19a66",
    },
    ".cm-completionIcon-keyword": {
      "&:after": { content: "'🔑'" },
      color: "#c678dd",
    },
  })
}

// Modern syntax highlighting colors
const syntaxHighlight = (isDark: boolean) => HighlightStyle.define([
  { tag: t.keyword, color: isDark ? "#c678dd" : "#a626a4" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: isDark ? "#e06c75" : "#e45649" },
  { tag: [t.function(t.variableName), t.labelName], color: isDark ? "#61afef" : "#4078f2" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: isDark ? "#d19a66" : "#986801" },
  { tag: [t.definition(t.name), t.separator], color: isDark ? "#e5c07b" : "#c18401" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: isDark ? "#e5c07b" : "#c18401" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: isDark ? "#56b6c2" : "#0184bc" },
  { tag: [t.meta, t.comment], color: isDark ? "#5c6370" : "#a0a1a7", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: isDark ? "#5c6370" : "#a0a1a7", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: isDark ? "#e06c75" : "#e45649" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: isDark ? "#d19a66" : "#986801" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: isDark ? "#98c379" : "#50a14f" },
  { tag: t.invalid, color: isDark ? "#ffffff" : "#ff0000" },
])

const setHighlightLine = StateEffect.define<{ line: number | null, variables: Record<string, unknown> }>()

const highlightLineState = StateField.define<{ line: number | null, variables: Record<string, unknown> }>({
  create: () => ({ line: null, variables: {} }),
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightLine)) {
        return effect.value
      }
    }
    return value
  },
})

// Helper to format values for inline display
const formatInlineValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    const str = JSON.stringify(value)
    return str.length > 20 ? `[${value.length} items]` : str
  }
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value as object)
    return keys.length > 3 ? `{${keys.length} keys}` : JSON.stringify(value)
  }
  return String(value)
}

class VariableWidget extends WidgetType {
  constructor(readonly text: string, readonly fullValues: Record<string, unknown>) {
    super()
  }

  toDOM() {
    const span = document.createElement("span")
    span.className = "ml-6 text-xs font-mono select-none bg-white/90 dark:bg-black/40 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-md inline-flex items-center gap-2 border border-sky-200 dark:border-sky-500/20 shadow-sm backdrop-blur-md transform translate-y-[-1px]"
    span.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.6)] dark:shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>${this.text}`
    
    // Add simple native tooltip as fallback or quick inspection
    span.title = JSON.stringify(this.fullValues, null, 2)
    
    return span
  }
}

// Removed variableTooltip extension as requested

const lineHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations = Decoration.none

    constructor(view: EditorView) {
      this.updateDecorations(view)
    }

    update(update: ViewUpdate) {
      let changed = false
      for (const effect of update.transactions.flatMap((tr) => tr.effects)) {
        if (effect.is(setHighlightLine)) {
          changed = true
        }
      }
      if (changed || update.docChanged) {
        this.updateDecorations(update.view)
      }
    }

    updateDecorations(view: EditorView) {
      const state = view.state.field(highlightLineState)
      const lineNum = state.line
      const variables = state.variables

      if (lineNum !== null && lineNum !== undefined && typeof lineNum === "number" && lineNum > 0) {
        try {
          const line = view.state.doc.line(lineNum)
          
          // Create line highlight
          const lineDeco = Decoration.line({
            class: "cm-line-highlight",
          }).range(line.from)

          // Create inline variable widgets
          const widgets = []
          
          // Only show variables that might be relevant to this line (simple heuristic)
          const lineText = line.text
          const relevantVars = Object.entries(variables).filter(([key]) => {
            // Don't show extremely long values inline
            return lineText.includes(key) && key !== "__builtins__"
          })

          if (relevantVars.length > 0) {
            const varText = relevantVars
              .map(([k, v]) => `<span class="opacity-70 text-sky-700/70 dark:text-sky-200/70">${k}:</span> <span class="font-medium text-sky-900 dark:text-sky-100">${formatInlineValue(v)}</span>`)
              .join(" <span class='text-sky-400/30 dark:text-sky-500/30 mx-1'>|</span> ")
            
            const fullValues = Object.fromEntries(relevantVars)

            widgets.push(
              Decoration.widget({
                widget: new VariableWidget(varText, fullValues),
                side: 1,
              }).range(line.to)
            )
          }

          this.decorations = Decoration.set([lineDeco, ...widgets])
        } catch {
          this.decorations = Decoration.none
        }
      } else {
        this.decorations = Decoration.none
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

export function Editor({ code, language = "python", onChange, currentLine, variables = {} }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for theme to be mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!editorRef.current || !mounted) return

    const isDark = (resolvedTheme || theme) === "dark"
    const langExtension = language === "javascript" || language === "typescript" ? javascript({ typescript: language === "typescript" }) : python()

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        keymap.of([...defaultKeymap, ...completionKeymap, ...closeBracketsKeymap]),
        langExtension,
        autocompletion(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        highlightLineState.init(() => ({ line: currentLine ?? null, variables })),
        lineHighlightPlugin,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString()
            onChange(newCode)
          }
        }),
        getTheme(isDark),
        syntaxHighlighting(syntaxHighlight(isDark)),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, resolvedTheme, language, mounted]) // Re-create editor on theme or language change

  // Handle updates to currentLine and variables separately
  useEffect(() => {
    if (viewRef.current) {
      const doc = viewRef.current.state.doc
      if (currentLine !== undefined && currentLine > 0 && currentLine <= doc.lines) {
        const line = doc.line(currentLine)
        
        viewRef.current.dispatch({
          effects: [
            setHighlightLine.of({ line: currentLine, variables }),
            EditorView.scrollIntoView(line.from, {
              y: "center",
            }),
          ],
        })
      } else {
        viewRef.current.dispatch({
          effects: [setHighlightLine.of({ line: null, variables: {} })],
        })
      }
    }
  }, [currentLine, variables])

  // Handle code updates from outside (if any)
  useEffect(() => {
    if (viewRef.current && code !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: code,
        },
      })
    }
  }, [code])

  // Prevent flash of incorrect theme during hydration
  if (!mounted) {
    return (
      <div className="h-full w-full overflow-hidden rounded-xl inset-panel">
        <div className="h-full w-full animate-pulse bg-muted/20" />
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-xl inset-panel">
      <div ref={editorRef} className="h-full" />
    </div>
  )
}

