import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { textblockTypeInputRule } from "@tiptap/core"
import { codeBlockNodeViewRenderer } from "./CodeBlockNodeView"

const lowlight = createLowlight(common)

const backtickInputRegex = /^```([a-z]+)?[\s\n]$/
const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/

export const supportedLanguages = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" }
]

export const languageAliases: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp"
}

export const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (element) => {
          const indent = element.getAttribute("data-indent")
          return indent ? parseInt(indent, 10) : 0
        },
        renderHTML: (attributes) => {
          if (!attributes.indent) return {}
          return { "data-indent": attributes.indent }
        }
      }
    }
  },

  addNodeView() {
    return codeBlockNodeViewRenderer
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type,
        getAttributes: (match) => {
          const { state } = this.editor
          const $from = state.selection.$from
          const node = $from.node($from.depth)
          const indent = node?.attrs?.indent || 0
          return {
            language: match[1] || this.options.defaultLanguage,
            indent
          }
        }
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes: (match) => {
          const { state } = this.editor
          const $from = state.selection.$from
          const node = $from.node($from.depth)
          const indent = node?.attrs?.indent || 0
          return {
            language: match[1] || this.options.defaultLanguage,
            indent
          }
        }
      })
    ]
  }
}).configure({
  lowlight,
  defaultLanguage: "plaintext"
})
