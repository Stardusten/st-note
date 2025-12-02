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
        class: "editor-title",
        style:
          "font-size: 29px; font-weight: 400; border-bottom: 1px solid rgb(27, 27, 29); box-shadow: rgba(72, 73, 75, 0.84) 0px 1px 0px; margin-bottom: 18px; padding-bottom: 8px;"
      },
      0
    ]
  }
}).configure({ levels: [1] })
