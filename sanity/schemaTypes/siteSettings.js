export default {
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  groups: [
    { name: "general", title: "General" },
    { name: "about", title: "About Page" },
    { name: "social", title: "Links" },
  ],
  fields: [
    {
      name: "commissionStatus",
      title: "Commission Status",
      type: "string",
      group: "general",
      description: "Shows the badge at the top of the Commissions page.",
      options: {
        list: [
          { title: "Currently Accepting Work", value: "open" },
          { title: "On a Break", value: "closed" },
        ],
        layout: "radio",
      },
      initialValue: "open",
    },
    {
      name: "portrait",
      title: "Portrait Photo",
      type: "image",
      group: "about",
      options: { hotspot: true },
    },
    {
      name: "aboutIntro",
      title: "Intro Line",
      type: "text",
      rows: 2,
      group: "about",
      description: "The short line next to your photo.",
    },
    {
      name: "stats",
      title: "Stats Row",
      type: "array",
      group: "about",
      of: [
        {
          type: "object",
          fields: [
            { name: "value", title: "Value", type: "string" },
            { name: "label", title: "Label", type: "string" },
          ],
          preview: { select: { title: "value", subtitle: "label" } },
        },
      ],
      description: 'e.g. value "100+", label "Pieces Created"',
    },
    {
      name: "story",
      title: "The Story",
      type: "text",
      rows: 6,
      group: "about",
    },
    {
      name: "approach",
      title: "The Approach",
      type: "text",
      rows: 6,
      group: "about",
    },
    {
      name: "studioPhotos",
      title: "Studio Photo Strip",
      type: "array",
      group: "about",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [{ name: "alt", title: "Alt Text", type: "string" }],
        },
      ],
      description: "Three photos looks best.",
    },
    {
      name: "instagramUrl",
      title: "Instagram URL",
      type: "url",
      group: "social",
    },
    { name: "tiktokUrl", title: "TikTok URL", type: "url", group: "social" },
    {
      name: "contactEmail",
      title: "Contact Email",
      type: "string",
      group: "social",
      description: "Used for the Email link in the footer.",
    },
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
};
