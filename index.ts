import { Client, FlatfileEvent } from "@flatfile/listener";
import api, { Flatfile } from "@flatfile/api";
import { workbookOne } from "./workbook";
import axios from "axios";

export default function flatfileEventListener(listener: Client) {

  // We use webhook.site to simulate a backend database where data will be submitted (switch the link below to your link, found on webhook.site)
  const webhookReceiver = "https://webhook.site/e3431240-e97b-44c1-bada-d6800503ef9e"

  // Defining what needs to be done when a new space gets created (when the "space:configure" job gets triggered via the "job:ready" event)
  listener.filter({ job: "space:configure" }).on("job:ready", async (event: FlatfileEvent) => {

    // Accessing all the elements we need from event.context to create a space, a workbook, and its sheet
    const { jobId, environmentId, spaceId } = event.context;

    try {

      // First, we acknowledge the job
      await api.jobs.ack(jobId, {
        info: "The job is acknowledged and is ready to execute",
        progress: 10
      });

      // Second, we create a Workbook (Wokbook One), its Sheet (Contacts), and a workbook-level Submit action
      await api.workbooks.create({
        environmentId,
        spaceId,
        name: "Workbook One",
        // We defined the structure of workbookOne in the "workbook.ts" file and imported it here to the "index.ts" file
        sheets: workbookOne,
        // Attaching a workbook-level Submit action. It is workbook-level because we create it inside of the "api.workbook.create()" API call
        actions: [
          {
            operation: "submitAction",
            mode: "foreground",
            label: "Submit",
            description: "Submit data to webhook.site",
            primary: true,
          },
        ]
      });

      // Third, we complete a job once a Space is created, and a Workbook with its Sheet is created and attached to it
      await api.jobs.complete(jobId, {
        outcome: {
          message: "Space is created with 1 workbook, 1 sheet, and a workbook-level Submit action"
        },
      });

    } catch (error) {
      // In case something goes wrong and the space:configure job cannot be completed, we fail the job with a message on what next steps to take
      await api.jobs.fail(jobId, {
        outcome: {
          message: "Creating a Space encountered an error. See Event Logs",
        },
      });
    }
  });

  // Defining what needs to be done when the "workbook:map" job is ready to execute (when "job:completed" event triggers)
  listener.on('job:completed', { job: 'workbook:map' }, async (event: FlatfileEvent) => {

    // Accessing "workbookId" that we need from event.context to get information about our workbook in the code below
    const { workbookId } = event.context

    // Using "workbookId" we extracted above, we fetch information about our workbook and store it inside the "workbook" variable
    const workbook = await api.workbooks.get(workbookId)

    // Extracting the sheet ID information from the first sheet inside the "workbook" variable, and storing that sheet ID inside the "sheetId" variable
    const sheetId = workbook.data.sheets[0].id

    // Creating a custom, sheet-level "dynamicAPIfield" job once "workbook:map" job completes (reaches the "job:completed event)
    await api.jobs.create({
      type: "sheet",
      operation: "dynamicAPIfield",
      source: sheetId,
      // trigger: "immediate" ensures our "dynamicAPIfield" custom job automatically triggers when used later in the code. Otherwise, it will require a manual trigger
      trigger: "immediate"
    })

  })

  // Defining what needs to be done when the "sheet:dynamicAPIfield" custom job is ready to execute (when "job:ready" event triggers)
  listener.on('job:ready', { job: "sheet:dynamicAPIfield" }, async (event: FlatfileEvent) => {

    // Accessing "jobId" from event.context to first acknowledge the "dynamicAPIfield" job below, and then either complete or fail it
    const { jobId } = event.context

    try {

      // Acknowledging the job
      await api.jobs.ack(jobId, {
        info: "The job is acknowledged and is ready to execute",
        progress: 10
      });

      // Accessing "workbookId" that we need from event.context to get information about our workbook
      const { workbookId } = event.context

      // Using "workbookId" we extracted above, we fetch information about our workbook and store it inside the "workbook" variable
      const workbook = await api.workbooks.get(workbookId)

      // Extracting information about the first sheet inside the "workbook" variable, and storing it inside its own "sheet" variable
      const sheet = workbook.data.sheets[0]

      // Defining the key of the field that we will dynamically create if a field with such key doesn't already exist. Storing it inside of the "dynamicFieldKey" variable
      const dynamicFieldKey = 'customColumn'

      // Filtering our sheet for the field that matches a field key stored inside of the "dynamicFieldKey" variable. Storing info about that field inside of the "field" variable
      const field = sheet.config.fields.find((f) => f.key === dynamicFieldKey)

      // If a field stored inside of the "field" variable already exists, we log an appropriate message
      if (field) {
        console.log('Field exists, skipping')
        return
      }

      // Otherwise, we update our sheet via API to add that field. After such API update, a newly-defined field will appear inside the table in Flatfie. 
      else {

        await api.sheets.addField(sheet.id,
          {
            key: dynamicFieldKey,
            label: "Custom Column",
            type: "string"
          }
        )

      }

      // Declaring a "pageNumber" variable initialized to 1. "pageNumber" will track the page number being fetched in the while loop below
      let pageNumber = 1

      // Creating a while loop that fetches records from an API in a paginated manner, starting from "pageNumber" (page 1)
      // Those fetched records are extracted and stored in the "records" variable.
      while (true) {

        const { data: { records } } = await api.records.get(sheet.id, {
          pageNumber: pageNumber++,
        })

        // Records are fetched until the API request above ( await api.records.get() ) receives an empty record set. At that point, we exit the while loop
        if (records.length === 0) {
          break
        }

        // Declaring "updatedRecords" variable. We use the .map() function on the "records" array to update individual records (r)
        const updatedRecords: Flatfile.Records = records.map((r) => {
          // Extracting the "values" property from each record (r)
          const values = r.values
          // Filtering for values of the field with field key stored inside of "dynamicFieldKey" variable above. For that field, we set its values to "hello world"
          values[dynamicFieldKey] = { value: 'hello world' }
          // Returning a new object for each record. Record ID values remain the same, while values are now updated specifically for the "Custom Column" field
          return {
            id: r.id,
            values,
          } as Flatfile.Record_

        })

        // Updating the records on the sheet (identified by sheet.id) with the modified "updatedRecords" array.
        await api.records.update(sheet.id, updatedRecords)

      }

      // Completing a job once a Workbook is updated to include "Custom Column" field with "hello world" values
      await api.jobs.complete(jobId, {

        outcome: {
          message: "Dynamic field added and updated with 'hello world' values"
        },

      });

      // If an error occurs during execution of any code inside of the "dynamicAPIfield" custom job, we fail the job and log the error to the Console
    } catch (error) {

      await api.jobs.fail(jobId, {
        outcome: {
          message: "Executing this job encountered an error. Please see Event logs in your dashboard",
        },
      })

      console.log(error)

    }

  })

  // Defining what needs to be done when a user clicks the "Submit" button (when the "workbook:submitAction" job gets triggered via "job:ready" event)
  listener.filter({ job: "workbook:submitAction" }).on("job:ready", async (event: FlatfileEvent) => {

    // Extracting the necessary information from event.context that we will use below
    const { jobId, workbookId } = event.context;

    try {

      // Acknowledging the job
      await api.jobs.ack(jobId, {
        info: "Acknowledging the Submit job that is now ready to execute",
        progress: 10,
      });

      // Retrieving a list of sheets associated with a workbook
      const { data: sheets } = await api.sheets.list({ workbookId });

      // Initializing "records" object that will store data fetched from individual sheets. Right now it is empty
      const records: { [name: string]: any } = {};

      // Iterating through list of sheets and fetching records for each sheet. Now, fetched data is stored in "records" object with keys in the format of "Sheet[index]"
      for (const [index, element] of sheets.entries()) {
        records[`Sheet[${index}]`] = await api.records.get(element.id);
      }

      // Sending data of records to webhook.site URL once a user clicks the Submit button
      const response = await axios.post(
        webhookReceiver,
        {
          records
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // If the axios POST call fails, the error below is thrown
      if (response.status !== 200) {
        throw new Error("Failed to submit data to webhook.site");
      }

      // If the axios POST call is successful, we complete the job with an appropriate message to the user
      await api.jobs.complete(jobId, {
        outcome: {
          message: `Data was successfully submitted to Webhook.site. Go check it out at ${webhookReceiver}.`,
        },
      });

      // If an error occurs during execution of any code inside of the "submitAction" listener, we fail the job and log the error to the Console
    } catch (error) {

      console.log(`webhook.site[error]: ${JSON.stringify(error, null, 2)}`);

      await api.jobs.fail(jobId, {
        outcome: {
          message: `This job failed. Check your ${webhookReceiver}.`,
        },
      });

    }
  });

}