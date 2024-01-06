# Getting Started

## First things FIRST

If you find any issues with this README, or the repo in general, please email me at how2flatfile@gmail.com, or make a PR. I do what I can to keep everything in order, but I am human, after all 🙂

## For visual learners

If you want to just follow the video on how to get everything done, [here is a Loom video](https://www.loom.com/share/2d9280d8b2ad4be2b270425255b25f8e?sid=079ae2d0-9a2e-4d47-9d76-7bdc0e9238aa)

**IMPORTANT -** If you follow the video above to get everything set up, the information below is still valuable to you

I recommend you read through it

## Step-by-step instructions

*The instructions below are intentionally very detailed and descriptive to help any developer, regardless of their skill level*


### Basics
- [Click this link](https://github.com/how2flatfile/create-field-dynamically-with-values.git) to access the repository

- Make sure that you are looking at the branch called `main`  

- Click on the green button that says `<> Code`, and copy the URL  

- Open your IDE, and clone the repository using the URL you just copied  

- Save the project on your computer (I prefer to save on the Desktop while I test)  

_________________________________________________
### Code Setup (valuable information for anyone)
- Open the project that you just saved on your computer. Open `index.ts` file

- On line 9, replace existing link inside `webhookReceiver` with your unique URL
  - Go to https://webhook.site/ , and copy `Your unique URL` from there

- Open the terminal, and run the command `npm install`

- Run `npm outdated`. If any Flatfile-related packages are not on the latest, update them to the latest
  - If you do update to the latest, run `npm outdated` again to ensure that update completed

- Run `npx flatfile@latest deploy`. For authentication, I prefer to select `API Key`
  - If you also select `API Key`, copy your `Secret Key` from your Flatfile dashboard

- Click enter, and confirm that terminal says `Event listener deployed and running ...`

_________________________________________________
### Test the workflow
- Login to your dashboard at `platform.flatfile.com`

- On the left panel, click `Portal`

- Click on `Recent Sessions`, then on the top-right click on `+ Create New Session`

- Give your Session a name, and click `Enter` on your keyboard

- Click `Add file`, and upload `example_file.csv` that is inside your project

- All fields should be auto-mapped. If they are not, map them, and then click `Continue`

- Notice hot `Custom Column` field with `Hello world` values was created dynamically

- On the top-right, click `Submit`. When you see the `Success` message, proceed to https://webhook.site/ 

- Notice how all fields were sent to https://webhook.site/ , including the dynamic `Custom Column` field