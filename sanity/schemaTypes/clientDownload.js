import DownloadLink from '../components/DownloadLink';

// ==========================================
// CLIENT DOWNLOADS
//
// One document = one customer's download page. The artist drops
// finished files (e.g. Photoshop layers) into folders, hits Publish,
// and copies the link from the "Customer Link" panel.
//
// Repeat customers: open their existing document and add another
// folder. The same link then shows every folder.
//
// The page lives at /downloads/<slug>. Customers can download files
// one by one, a folder as a zip, or everything at once. It is not
// linked from anywhere on the site and is excluded from search
// engines.
// ==========================================

export default {
  name: 'clientDownload',
  title: 'Client Downloads',
  type: 'document',
  groups: [
    { name: 'setup', title: 'Setup', default: true },
    { name: 'files', title: 'The Files' },
  ],
  fields: [
    {
      name: 'clientName',
      title: 'Customer Name',
      type: 'string',
      group: 'setup',
      description: 'Shown at the top of their page. e.g. "Jane Doe"',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Link Address',
      type: 'slug',
      group: 'setup',
      description:
        'Click Generate. It adds a random ending so the link cannot be guessed — this is what keeps the files private, so do not shorten it.',
      options: {
        source: 'clientName',
        maxLength: 60,
        slugify: (input) => {
          const base =
            input
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 30) || 'customer';
          const rand = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) =>
            b.toString(16).padStart(2, '0')
          ).join('');
          return `${base}-${rand}`;
        },
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'shareLink',
      title: 'Customer Link',
      type: 'string',
      group: 'setup',
      readOnly: true,
      components: { input: DownloadLink },
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'setup',
      description:
        'Archived pages stop working for the customer but stay here for your records.',
      options: {
        list: [
          { title: 'Active — customer can download', value: 'active' },
          { title: 'Archived — link no longer works', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'message',
      title: 'Note to Customer',
      type: 'text',
      rows: 3,
      group: 'setup',
      description: 'Optional. Shown under their name, e.g. "Thanks again — layers are organised by version."',
    },
    {
      name: 'folders',
      title: 'Folders',
      type: 'array',
      group: 'files',
      description:
        'One folder per order or project. Add a new folder here when a repeat customer orders again.',
      of: [
        {
          type: 'object',
          name: 'downloadFolder',
          title: 'Folder',
          fields: [
            {
              name: 'name',
              title: 'Folder Name',
              type: 'string',
              description: 'What the customer sees, e.g. "Album Cover — Layers".',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'files',
              title: 'Files',
              type: 'array',
              description: 'Drag files in here — you can drop a whole selection at once.',
              of: [{ type: 'file' }],
            },
          ],
          preview: {
            select: { title: 'name', files: 'files' },
            prepare: ({ title, files }) => ({
              title: title || 'Untitled folder',
              subtitle: `${files?.length || 0} file(s)`,
            }),
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1).error('Add at least one folder.'),
    },
  ],

  preview: {
    select: { title: 'clientName', status: 'status', slug: 'slug.current' },
    prepare({ title, status, slug }) {
      return {
        title: title || 'Untitled',
        subtitle:
          (status === 'archived' ? 'Archived' : 'Active') +
          (slug ? ` · /downloads/${slug}` : ''),
      };
    },
  },
};
