export default {
  name: "galleryItem",
  title: "Gallery",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "category",
      title: "Category",
      type: "string",
      description: "Controls which filter button shows this piece.",
      options: {
        list: [
          { title: "Posters", value: "Posters" },
          { title: "Prints", value: "Prints" },
          { title: "Album Art", value: "Album Art" },
          { title: "Promo", value: "Promo" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "medium",
      title: "Medium",
      type: "string",
      description: 'Optional. e.g. "Acrylic and ink on paper"',
    },
    {
      name: "year",
      title: "Year",
      type: "string",
      description: "Optional.",
    },
    {
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first.",
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
    select: { title: "title", subtitle: "category", media: "image" },
  },
};
