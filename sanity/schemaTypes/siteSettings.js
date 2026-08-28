export default {
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  groups: [
    { name: "general", title: "General" },
    { name: "store", title: "Store" },
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
      name: "storeIntro",
      title: "Store Intro Line",
      type: "text",
      rows: 2,
      group: "store",
      description:
        "The line under the Store headline. Leave blank to use the default.",
    },
    {
      name: "shippingRateUsd",
      title: "Shipping Charge (USD)",
      type: "number",
      group: "store",
      description:
        "Flat rate added at checkout. Set it to 0 for free shipping.",
      initialValue: 8,
      validation: (Rule) => Rule.min(0),
    },
    {
      name: "localPickupEnabled",
      title: "Offer local pickup",
      type: "boolean",
      group: "store",
      description:
        "Adds a free \u201cLocal pickup / hand delivery\u201d option at checkout.",
      initialValue: true,
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
      description:
        "Used for the Email link in the footer, and on concept review pages.",
    },
    {
      name: "artistName",
      title: "Your Name",
      type: "string",
      group: "social",
      description:
        "Shown on concept review pages so clients know who to reply to.",
    },
    {
      name: "contactPhone",
      title: "Contact Phone",
      type: "string",
      group: "social",
      description:
        "Shown on concept review pages only \u2014 not on the public site.",
    },
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
};
