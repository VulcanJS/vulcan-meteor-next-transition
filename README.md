# From Meteor to Next

This repository demoes using a Vulcan Next frontend with a legacy Vulcan Meteor backend.
This is targeted at existing Vulcan application that needs a progressive migration.

/!\ Please use Vulcan Next directly if you are not an experimented user of Vulcan Meteor

## Install

```sh
git clone https://github.com/VulcanJS/vulcan-meteor-next-transition
cd ./vulcan-next-transition
git submodule update --init --recursive
```

## Start the Meteor server

```sh
cd ./meteor-backend
# For contributions, go to the right branch (submodules only gets you to a commit)
# git checkout demo/with-next-frontend
# Install if not yet done: 
meteor npm install
cp ./sample_settings.json ./settings.json
meteor npm run start -- --port=3001
# Remember to also read ./meteor-backend/README.md to continue the setup
```

## Start the Next frontend

```sh
cd ./next-frontend
# For contributions, go to the right branch (submodules only gets you to a commit)
# git checkout demo/with-meteor-backend
# Install if not yet done: 
yarn install
yarn run dev
# Remember to also read ./next-frontend/README.md to continue the setup
```

## Use the app

The Next frontend will run on http://localhost:3000 ; the Meteor backend will run on http://localhost:3001. Note: you can still access the frontend part of your Meteor app as well! This is great if you want to keep the admin area in Meteor for instance, but move some pages to Next progressively.

You can authenticate in the Vulcan Next app as usual, using the same credentials you would use in Meteor.

Access the http://localhost:3000/meteor-demo to see the connection in action.


## How it works

### Frontend

Top priority of this demo is to connect a Vulcan Next frontend to an existing Meteor backend.

- Next.js Apollo client is configured to use Meteor's graphql endpoint, running on port 3001. This value is set in `next-frontend/.env.development`.
- Seed from Next.js is disabled in `next-frontend/src/api/seed.ts` (we suppose you handle this in Meteor directly)
- MONGO_URI is changed to connect to the Meteor DB. Technically, this is not necessary if you use Next only for frontend, but we still need this change this value to deactivate the demo mode that is automatically enabled when we detect you are using the demo database.
- useUser hook  will rely on Meteor useCurrentUser under the hood in `next-frontend/src/components/user/hooks.ts`
- Changed `next-frontend/src/pages/login.tsx`, `next-frontend/src/pages/signup.tsx` and `next-frontend/src/components/layout/Footer.tsx` to use legacy hooks to connect to Meteor. NOTE: in a future iteration, we should abstract the Next.js version into hooks, to make this cleaner
- Define Apollo CORS so we can include crendentials in `meteor-backed/settings.json`
- Setup CORS cookies in the Next frontend in `next-frontend/packages/@vulcanjs/next-apollo/apolloClient.ts`
- The `meteor-backend/packages/getting-started/lib/modules/vulcanResource/vulcanResource.js` file contains common parts, ie the schema. It is reused to build the Vulcan Meteor collection, as well as the equivalent Vulcan Next model (model is the new terms for collection, and it's way more powerful, but only available in Next at the moment).
We cannot put this folder as the root, as Meteor cannot import file outside of the package. So it has to live in Meteor until we find a better approach for the `common` folder.

- Automated emails (eg for mail verification after signup) needs to point to the Next frontend, even if they are triggered by the Next.js backend. If you use those features, you'll need to add this piece of code in the Meteor app: 
```js
Meteor.startup(() => {
    Accounts.urls.resetPassword = function(token) {
    // where localhost:3000 is your Next.js app
        return 'http://localhost:3000/reset-password/' + token;
};
```
(TODO: we should add this feature in this repo and make it more configurable based on a Meteor setting)

## Full-stack = progressively use Next as your backend

In the long run, the goal is to transition the Meteor backend to Next as well, using Next API routes.

- Next is configured to use the same Mongo database as Meteor locally. To get the URL of the local Meteor database, run `meteor mongo -U`. It's most probably something like this: `mongodb://127.0.0.1:3002/meteor`
- TODO: in Next, configure Passport to authenticate users using the existing Mongo database from Meteor
- You can use both Next's GraphQL API and Meteor's GraphQL API using the [Connect to multiple graphql API in the frontend pattern described here](https://github.com/VulcanJS/vulcan-next/blob/demo/with-meteor-backend/src/content/docs/recipes.md)
## Caveats

- Check Vulcan NPM migration documentation to see the difference between Vulcan Meteor and Vulcan Next: https://github.com/VulcanJS/vulcan-npm/blob/devel/MIGRATING.md
