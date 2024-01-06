import { SheetConfig } from '@flatfile/api/api';

// Defining the structure of our Contacts sheet 
const contactsSheet: SheetConfig = {
    name: 'Contacts',
    slug: 'contacts',
    // this needs to be enabled to allow additional fields to be dynamically created
    allowAdditionalFields: true,
    fields: [
        {
            key: "first_name",
            type: "string",
            label: "First name",
        },
        {
            key: "last_name",
            type: "string",
            label: "Last name",
        },
        {
            key: "email",
            type: "string",
            label: "Email",
        },
    ]
}

// Exporting Contacts sheet as part of a Workbook defined as workbookOne. We import this Workbook in index.ts to then create a space with this Workbook's configuration
export const workbookOne = [{ ...contactsSheet }];