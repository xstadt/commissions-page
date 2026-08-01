export default {
  name: "product",
  title: "Store Products",
  type: "document",
  groups: [
    { name: "details", title: "Details", default: true },
    { name: "media", title: "Photos" },
    { name: "pricing", title: "Price & Payment" },
    { name: "status", title: "Availability" },
  ],
  fields: [
    // ---------------- DETAILS ----------------
    {
      name: "name",
      title: "Name",
      type: "string",
      group: "details",
      description: 'What this piece is called — e.g. "The Daily" or "Sunburst No. 4".',
      validation: (Rule) => Rule.required(),
    },
    {
      name: "slug",
      title: "Product ID",
      type: "slug",
      group: "details",
      description:
        "Click Generate. This is how orders get matched back to the right piece — do not change it after the product goes live.",
      options: { source: "name", maxLength: 40 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "category",
      title: "Category",
      type: "reference",
      group: "details",
      to: [{ type: "productCategory" }],
      description:
        "Which filter button this shows up under. Add new categories under Store Categories.",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "size",
      title: "Size or Dimensions",
      type: "string",
      group: "details",
      description: 'Optional. e.g. "24 oz", "18 x 24 in", "Size L".',
    },
    {
      name: "medium",
      title: "Materials",
      type: "string",
      group: "details",
      description: 'Optional. e.g. "Acrylic and ink on stainless steel".',
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      group: "details",
      description: "Optional — a few words about this specific piece.",
    },

    // ---------------- MEDIA ----------------
    {
      name: "image",
      title: "Main Photo",
      type: "image",
      group: "media",
      options: { hotspot: true },
      description:
        "The photo of this exact piece. Everything here is one-of-one, so shoot the real thing rather than using a mockup.",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "gallery",
      title: "More Photos",
      type: "array",
      group: "media",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [{ name: "alt", title: "Alt Text", type: "string" }],
        },
      ],
      description:
        "Optional. Other angles, close-ups, or scale shots. Shoppers can flip through these on the product page.",
    },

    // ---------------- PRICING ----------------
    {
      name: "price",
      title: "Price (USD)",
      type: "number",
      group: "pricing",
      validation: (Rule) => Rule.required().min(1),
    },
    {
      name: "compareAtPrice",
      title: "Was Priced At (USD)",
      type: "number",
      group: "pricing",
      description:
        "Optional. Fill this in only if you want the old price shown crossed out next to the new one. Leave blank otherwise.",
      validation: (Rule) =>
        Rule.min(0).custom((was, ctx) =>
          !was || !ctx.document?.price || was > ctx.document.price
            ? true
            : "The old price needs to be higher than the current price."
        ),
    },
    {
      name: "paymentMode",
      title: "How to charge for this",
      type: "string",
      group: "pricing",
      description:
        "Charge right away is normal checkout — the money lands in your account immediately. Ask me first puts a hold on the card instead: nothing is taken until you approve the order in Stripe, and the piece is set aside in the meantime. Heads up, card holds expire after 7 days, so approve or release within a week.",
      options: {
        list: [
          { title: "Charge right away", value: "immediate" },
          { title: "Ask me first — hold the card until I approve", value: "approval" },
        ],
        layout: "radio",
      },
      initialValue: "immediate",
      validation: (Rule) => Rule.required(),
    },

    // ---------------- STATUS ----------------
    {
      name: "featured",
      title: "Feature this piece",
      type: "boolean",
      group: "status",
      description: 'Pushes it to the front of the Store when sorting is set to "Featured".',
      initialValue: false,
    },
    {
      name: "order",
      title: "Display Order",
      type: "number",
      group: "status",
      description: "Lower numbers appear first. Ties get broken by newest first.",
      initialValue: 0,
    },
    {
      name: "sold",
      title: "Off the shop",
      type: "boolean",
      group: "status",
      description:
        "Flips on by itself the moment someone buys or reserves this piece. You can also switch it on yourself to quietly pull something from the store.",
      initialValue: false,
    },
    {
      name: "orderState",
      title: "Order Stage",
      type: "string",
      group: "status",
      description:
        "Set automatically. Awaiting your approval means a card is on hold and waiting on you in Stripe. Paid means the money has cleared.",
      options: {
        list: [
          { title: "Not ordered", value: "none" },
          { title: "Awaiting your approval", value: "pending" },
          { title: "Paid", value: "paid" },
        ],
      },
      readOnly: true,
      hidden: ({ document }) => !document?.orderState || document.orderState === "none",
    },
    {
      name: "soldOrderId",
      title: "Stripe Checkout Reference",
      type: "string",
      group: "status",
      description: "Filled in automatically. Links this piece to the order in Stripe.",
      readOnly: true,
      hidden: ({ document }) => !document?.soldOrderId,
    },
    {
      name: "paymentIntentId",
      title: "Stripe Payment Reference",
      type: "string",
      group: "status",
      description:
        "Filled in automatically. This is the payment you approve or release in the Stripe dashboard.",
      readOnly: true,
      hidden: ({ document }) => !document?.paymentIntentId,
    },
    {
      name: "soldAt",
      title: "Ordered On",
      type: "datetime",
      group: "status",
      readOnly: true,
      hidden: ({ document }) => !document?.soldAt,
    },
  ],

  orderings: [
    {
      title: "Display Order",
      name: "orderAsc",
      by: [
        { field: "order", direction: "asc" },
        { field: "_createdAt", direction: "desc" },
      ],
    },
    { title: "Newest First", name: "newest", by: [{ field: "_createdAt", direction: "desc" }] },
    { title: "Price: Low to High", name: "priceAsc", by: [{ field: "price", direction: "asc" }] },
  ],

  preview: {
    select: {
      title: "name",
      category: "category.title",
      media: "image",
      sold: "sold",
      orderState: "orderState",
      price: "price",
      paymentMode: "paymentMode",
    },
    prepare({ title, category, media, sold, orderState, price, paymentMode }) {
      let mark = "";
      if (orderState === "pending") mark = " — NEEDS YOUR APPROVAL";
      else if (sold) mark = " — Sold";
      else if (paymentMode === "approval") mark = " — Ask me first";

      const bits = [category, typeof price === "number" ? `$${price}` : null].filter(Boolean);

      return {
        title: `${title}${mark}`,
        subtitle: bits.join(" · "),
        media,
      };
    },
  },
};
