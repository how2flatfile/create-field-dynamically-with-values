// Importing the packages and variables we need to run the code below
import { Client, FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import api, { Flatfile } from "@flatfile/api";
import { workbookOne } from "./workbook";
import axios from "axios";

// We use webhook.site to simulate a backend database where data will be submitted (switch the link below to your link, found on webhook.site)
const webhookReceiver = "https://webhook.site/3d6f2ece-c9ef-4ab8-b2c2-efe2312759d2"

// Defining the main function where all the code will execute
export default function flatfileEventListener(listener: Client) {

  // Restricting the code below to apply only to a specific app that has "appOne" namespace
  listener.namespace(["*:appOne"], (appOne: FlatfileListener) => {

    // Defining what needs to be done when a new space gets created
    appOne.filter({ job: "space:configure" }).on("job:ready", async (event: FlatfileEvent) => {

      // Accessing all the elements we need from event.context to create a space, a workbook, and its sheet
      const { jobId, spaceId, } = event.context;

      try {

        // First, we acknowledge the job
        await api.jobs.ack(jobId, {
          info: "The job is acknowledged and is ready to execute",
          progress: 10
        });

        // Second, we create a Workbook (Wokbook One), its Sheet (Contacts), and a workbook-level Submit action
        await api.workbooks.create({
          spaceId,
          name: "Workbook One",
          // We defined the structure of workbookOne in the "workbook.ts" file and imported it here to the "index.ts" file
          sheets: workbookOne,
          // Creating a workbook-level Submit button
          actions: [
            {
              operation: "submitAction",
              // This ensures that after a user clicks on the Submit button, a modal will appear to show that submission is in progress
              mode: "foreground",
              label: "Submit",
              description: "Submit data to webhook.site",
              // This ensures that the action is more visibly present at the top-right corner of the Importer
              primary: true,
            },
          ]
        });

        // Third, we complete a job once a Space, a Workbook with its Sheet, and a Submit button are created
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

    // Defining what needs to be done when Flatfile finishes mapping columns based on user input
    appOne.on('job:completed', { job: 'workbook:map' }, async (event: FlatfileEvent) => {

      // Accessing "workbookId" and "jobId" from event.context to access our workbook via API, and then to also store mapping job's jobId for later use
      const { workbookId, jobId } = event.context

      // Using "workbookId" we extracted above, we fetch information about our workbook and store it inside the "workbook" variable
      const workbook = await api.workbooks.get(workbookId)

      // Extracting the sheet ID information from the first sheet inside the "workbook" variable
      const sheetId = workbook.data.sheets[0].id

      // Creating a custom, sheet-level "dynamicAPIfield" job that we will execute in the next listener
      await api.jobs.create({
        type: "sheet",
        operation: "dynamicAPIfield",
        source: sheetId,
        // This ensures that our custom job will execute automatically when the "job:ready" event triggers in the next listener
        trigger: "immediate",
        // This ensures that in the next listener we are able to access the jobId of the mapping job specifically, and not just the jobId of this custom job
        input: { mappingJobId: jobId }
      })

    })

    // Defining what needs to be done when our custom job triggers. Because we create it when mapping job completes, this is when this job will begin executing
    appOne.on('job:ready', { job: "sheet:dynamicAPIfield" }, async (event: FlatfileEvent) => {

      // Accessing "jobId" and "workbookId" from event.context for use in the API calls below
      const { jobId, workbookId } = event.context

      try {

        // First, we acknowledge the job
        await api.jobs.ack(jobId, {
          info: "The job is acknowledged and is ready to execute",
          progress: 10
        });

        // Using "workbookId" we extracted above, we fetch information about our workbook and store it inside the "workbook" variable
        const workbook = await api.workbooks.get(workbookId)

        // Extracting information about the first sheet inside the "workbook" variable, and storing it inside its own "sheet" variable
        const sheet = workbook.data.sheets[0]

        // Retrieving the info on the custom job we created in the listener above, and storing that info in its own "customJobInfo" variable
        const customJobInfo = await api.jobs.get(jobId)

        // From "customJobInfo" variable, retrieving the jobId specifically of the mapping job that completed, and storing it in its own "mappingJobId" variable
        const mappingJobId = customJobInfo.data.input.mappingJobId

        // Obtaining the mapping job's execution plan to later extract "fieldMapping" out of it, which tells us which fields were mapped in the Matching step
        const jobPlan = await api.jobs.getExecutionPlan(mappingJobId)

        // Initializing an empty array to store the keys of the mapped fields
        const mappedFields = [];

        // Iterating through all destination fields that are mapped and extracting their field keys. Then, pushing keys of mapped fields to the "mappedFields" variable
        for (let i = 0; i < jobPlan.data.plan.fieldMapping.length; i++) {
          const destinationFieldKey = jobPlan.data.plan.fieldMapping[i].destinationField.key;

          mappedFields.push(destinationFieldKey);
        }

        // Defining the key of the field that we will dynamically create if a field with such key doesn't already exist. Storing it inside of the "dynamicFieldKey" variable
        const dynamicFullNameFieldKey = 'fullName'

        // If both First Name and Last name fields are mapped, we dynamically add a "Full Name" field via API that combines values of first and last name fields
        if (mappedFields.includes("first_name") && mappedFields.includes("last_name")) {

          // Adding a new Full Name field to the sheet
          await api.sheets.addField(sheet.id,
            {
              key: dynamicFullNameFieldKey,
              label: "Full Name",
              type: "string"
            }
          )

          // Declaring a "pageNumber" variable initialized to 1. "pageNumber" will track the page number being fetched in the while loop below
          let pageNumber = 1

          // Creating a while loop that fetches records from an API in a paginated manner and updates values of Full Name column with combined values from First Name and Last Name fields
          while (true) {

            // Fetching records via API in a paginated manner and storing them inside the "records" variable
            const { data: { records } } = await api.records.get(sheet.id, {
              pageNumber: pageNumber++,
            })

            // Records are fetched until the API request above receives an empty record set. At that point, we exit the while loop
            if (records.length === 0) {
              break
            }

            // Declaring "updatedRecords" variable. We use the .map() function on the "records" array to update individual records (r)
            const updatedRecords: Flatfile.Records = records.map((r) => {

              // Extracting the "values" property from each record (r)
              const values = r.values
              
              // Setting record values for Full Name field to be a concatenation of values from First Name and Last Name column, separated by a space
              values[dynamicFullNameFieldKey] = { value: values.first_name.value + " " + values.last_name.value }

              // Returning a new object for each record. Record ID values remain the same, while values are now updated for the Full Name field
              return {
                id: r.id,
                values,
              } as Flatfile.Record_

            })

            // Updating the records on the sheet (identified by sheet.id) with the modified "updatedRecords" array.
            await api.records.update(sheet.id, updatedRecords)

          }

        }

        // Completing the job once the code above executes
        await api.jobs.complete(jobId, {

          outcome: {
            message: "Table update complete. Please audit the data",
            // This requires a user to acknowledge that this job is complete before they can audit the data
            acknowledge: true
          },

        });

      } catch (error) {

        // If an error occurs during execution of the above code, we fail the job with the specific message
        await api.jobs.fail(jobId, {
          outcome: {
            message: "Executing this job encountered an error. Please see Event logs in your dashboard",
          },
        })

      }

    })

    // Defining what needs to be done when a user clicks the Submit button to send the data to the database
    appOne.filter({ job: "workbook:submitAction" }).on("job:ready", async (event: FlatfileEvent) => {

      // Extracting the necessary information from event.context that we will use below
      const { jobId, workbookId } = event.context;

      try {

        // First, we acknowledge the job
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
            message: "Data successfully submited",
          },

        });

      } catch (error) {

        // In case something goes wrong while executing the Submit job, we fail the job with a message on what next steps to take
        await api.jobs.fail(jobId, {

          outcome: {
            message: "Submitting the data encountered an error. See event logs"
          },

        });

      }

    });

  })

}