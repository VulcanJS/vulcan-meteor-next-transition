# From Meteor to Next

This repository demoes using a Vulcan Next frontend with a legacy Vulcan Meteor backend.
This is targeted at existing Vulcan application that needs a progressive migration.

## Start the Meteor server

```sh
cd ./meteor-backend
# Install if not yet done: meteor npm install
git checkout demo/with-next-frontend
meteor npm run start -- --port=3001
```

## Start the Next frontend

```sh
cd ./next-frontend
# Install if not yet done: yarn install
git checkout demo/with-meteor-backend
yarn run dev
```

## How it works

### Frontend

Top priority of this demo is to connect a Vulcan Next frontend to an existing Meteor backend.

- Next.js Apollo client is configured to use Meteor's graphql endpoint, running on port 3001. This value is set in `next-frontend/.env.development`.
- Seed from Next.js is disabled in `next-frontend/src/api/seed.ts` (we suppose you handle this in Meteor directly)
- MONGO_URI is changed to connect to the Meteor DB. Technically, this is not necessary if you use Next only for frontend, but we still need this change this value to deactivate the demo mode that is automatically enabled when we detect you are using the demo database.
- useUser hook  will rely on Meteor useCurrentUser under the hood in `next-frontend/src/components/user/hooks.ts`
- Changed `next-frontend/src/pages/login.tsx`, `next-frontend/src/pages/signup.tsx` and `next-frontend/src/components/layout/Footer.tsx` to use legacy hooks to connect to Meteor. NOTE: in a future iteration, we should abstract the Next.js version into hooks, to make this cleaner
- Define Apollo CORS so we can include crendentials in `meteor-backed/settings.json`
- TODO: cross-origin set-cookie are not working. We might need to update Vulcan to support this https://stackoverflow.com/questions/46288437/set-cookies-for-cross-origin-requests, https://stackoverflow.com/questions/1134290/cookies-on-localhost-with-explicit-domain/1188145#1188145
In Vulcan, relevant file is: packages/vulcan-users/lib/server/mutations.js, it might need some additional headers/setup to work ok in production


### Full-stack = progressively use Next as your backend

In the long run, the goal is to transition the Meteor backend to Next as well, using Next API routes.

- Next is configured to use the same Mongo database as Meteor locally. To get the URL of the local Meteor database, run `meteor mongo -U`. It's most probably something like this: `mongodb://127.0.0.1:3002/meteor`
- TODO: in Next, configure Passport to authenticate users using the existing Mongo database from Meteor