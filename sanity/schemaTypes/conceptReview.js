import ShareLink from '../components/ShareLink';
import PasswordInput from '../components/PasswordInput';

// ==========================================
// CONCEPT REVIEW
//
// One document = one private page shown to one prospective client.
// The artist fills this in, hits Publish, and copies the link and
// password straight out of the "Client Link" panel at the top.
//
// The page lives at /concepts/<slug> and asks for the password
// before showing anything. It is not linked from anywhere on the
// site and is excluded from search engines.
// ==========================================

export default {
  name: 'conceptReview',
  title: 'Concept Reviews',
  type: 'document',
  groups: [
    { name: 'setup', title: 'Setup', default: true },
    { name: 'content', title: 'The Concepts' },
  ],
  fields: [
    {
      name: 'clientName',
      title: 'Client / Band Name',
      type: 'string',
      group: 'setup',
      description: 'Shown at the top of their page. e.g. "Spafford"',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Link Address',
      type: 'slug',
      group: 'setup',
      description:
        'Click Generate to build this from the client name. This becomes the web address, so keep it simple and lowercase.',
      options: {
        source: 'clientName',
        maxLength: 60,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60),
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'password',
      title: 'Password',
      type: 'string',
      group: 'setup',
      description:
        'What the client types to get in. Not case sensitive. Click Suggest for one based on their name.',
      components: { input: PasswordInput },
      validation: (Rule) =>
        Rule.required()
          .min(4)
          .error('Use at least 4 characters.'),
    },
    {
      name: 'shareLink',
      title: 'Client Link',
      type: 'string',
      group: 'setup',
      readOnly: true,
      components: { input: ShareLink },
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'setup',
      description:
        'Archived pages stop working for the client but stay here for your records.',
      options: {
        list: [
          { title: 'Active — client can view it', value: 'active' },
          { title: 'Archived — link no longer works', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    },

    {
      name: 'clientLogo',
      title: 'Client Logo',
      type: 'image',
      group: 'content',
      description:
        'Optional. Their logo, shown above the title. A PNG with a transparent background looks best.',
      options: { hotspot: true },
    },
    {
      name: 'direction',
      title: 'The Direction',
      type: 'text',
      rows: 5,
      group: 'content',
      description:
        'A short paragraph on where you are taking this and why. Shown under the title, before the concepts.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'watermark',
      title: 'Add watermark overlay',
      type: 'boolean',
      group: 'content',
      description:
        'Draws a repeating Visual Frequencies mark across each concept. Turn this off if you already watermarked the files yourself before uploading.',
      initialValue: true,
    },
    {
      name: 'concepts',
      title: 'Concepts',
      type: 'array',
      group: 'content',
      description: 'Drag to reorder. Two or three works best.',
      of: [
        {
          type: 'object',
          name: 'concept',
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
              description: 'e.g. "Desert Bloom" — or just "Concept One".',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'image',
              title: 'Mockup',
              type: 'image',
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 4,
              description: 'Two or three sentences on the idea behind it.',
              validation: (Rule) => Rule.required(),
            },
          ],
          preview: {
            select: { title: 'title', subtitle: 'description', media: 'image' },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1).error('Add at least one concept.'),
    },
  ],

  preview: {
    select: {
      title: 'clientName',
      status: 'status',
      slug: 'slug.current',
      media: 'clientLogo',
    },
    prepare({ title, status, slug, media }) {
      return {
        title: title || 'Untitled',
        subtitle:
          (status === 'archived' ? 'Archived' : 'Active') +
          (slug ? ` · /concepts/${slug}` : ''),
        media,
      };
    },
  },
};
