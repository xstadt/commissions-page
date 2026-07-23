import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'Visual Frequencies Studios',
  projectId: 'uo61beyo',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
      S.list()
      .title('Content')
      .items([
        S.listItem()
        .title('Site Settings')
        .child(
          S.document().schemaType('siteSettings').documentId('siteSettings')
        ),
        S.divider(),
             S.documentTypeListItem('product').title('Water Bottles'),
             S.documentTypeListItem('galleryItem').title('Gallery'),
      ]),
    }),
  ],
  schema: { types: schemaTypes },
});
