# Getting Started

## First things FIRST

If you find any issues with this README, or the repo in general, please email me at how2flatfile@gmail.com, or make a PR. I do what I can to keep everything in order, but I am human, after all 🙂

## For visual learners

If you want to just follow the video on how to get everything done, [here is a Loom video](https://www.loom.com/share/ca49c0f0facd4f31ad38d808b697115f?sid=5c4e2475-5d16-4e5e-a97c-4285fcd782d6)

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

- On line 8, replace existing link inside `webhookReceiver` with your unique URL
  - Go to https://webhook.site/ , and copy `Your unique URL` from there

- Open the terminal, and run `npm install`

- Run `npm outdated`. If any Flatfile packages are not on the latest, update them to the latest
  - If you do update to the latest, run `npm outdated` again to ensure that update completed

- Run `npx flatfile@latest deploy`. For authentication, I prefer to select `API Key`
  - If you also select `API Key`, copy your `Secret Key` from your Flatfile dashboard

- Click enter, and confirm that terminal says `Event listener deployed and running ...`

_________________________________________________
### Test the workflow
- Login to your dashboard at `platform.flatfile.com`

- On the left panel, select `App One` app. If you don't have it, click `+ Add an App`
  - Ensure that your `App One` has `Namespace` set to `appOne`

- Select `App One` app in your left panel, then click `+ Create New Session` on the top right

- Give your Session a name, and click `Enter` on your keyboard
  - If a Space you just created doesn't automatically open in a new tab, click on its name

- Click `Upload file`, and upload `example_file.csv` that is inside your project

- All fields should be auto-mapped. If they are not, map them, and then click `Continue`
  - `First Name` and `Last Name` fields must be mapped to create `Full Name` field dynamically

- When Flatfile table updates with dynamic `Full Name` field you will see a modal appear. Click `Continue`
  - Notice the `Full Name` field with values concatenated from `First Name` and `Last Name` fields

- On the top-right, click `Submit`. When you see the `Success` message, proceed to https://webhook.site/ 

- Notice how all fields were sent to https://webhook.site/ , including the dynamic `Full Name` field