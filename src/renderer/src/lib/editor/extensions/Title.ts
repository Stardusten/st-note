import Heading from "@tiptap/extension-heading"

export const Title = Heading.extend({
  name: "title",
  group: "title",
  parseHTML() {
    return [{ tag: "h1:first-child" }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "h1",
      {
        ...HTMLAttributes,
        class: "editor-title"
      },
      0
    ]
  }
}).configure({ levels: [1] })
