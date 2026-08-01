export default {
  name: "productCategory",
  title: "Store Categories",
  type: "document",
  description:
    "The groups your products get sorted into on the Store page. Add a new one any time you start selling a new kind of thing.",
  fields: [
    {
      name: "title",
      title: "Category Name",
      type: "string",
      description:
        'What shoppers see on the filter button. Plural reads best — e.g. "Water Bottles", "Original Paintings", "Skate Decks".',
      validation: (Rule) => Rule.required(),
    },
    {
      name: "slug",
      title: "Category ID",
      type: "slug",
      description:
        "Generated from the name — click Generate. Used behind the scenes, so leave it alone once products are using this category.",
      options: { source: "title", maxLength: 40 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "blurb",
      title: "Short Blurb",
      type: "text",
      rows: 2,
      description:
        "Optional. Shows under the filter buttons when a shopper picks this category.",
    },
    {
      name: "order",
      title: "Display Order",
      type: "number",
      description:
        "Controls where this category sits in the filter row. Lower numbers appear first.",
      initialValue: 0,
    },
  ],
  orderings: [
    {
      title: "Display Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "blurb" },
  },
};
