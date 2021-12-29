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

- Replace "Link" from "react-router-dom" by Link from Next.js https://nextjs.org/docs/api-reference/next/link

## Full-stack = progressively use Next as your backend

In the long run, the goal is to transition the Meteor backend to Next as well, using Next API routes.

- Next is configured to use the same Mongo database as Meteor locally. To get the URL of the local Meteor database, run `meteor mongo -U`. It's most probably something like this: `mongodb://127.0.0.1:3002/meteor`
- TODO: in Next, configure Passport to authenticate users using the existing Mongo database from Meteor.
Vulcan Next now provides authentication.
To update password:
    - In Vulcan Meteor, hashed password lives in `services.password.bcrypt`
    - You need to split this value like this: 22 characters after the 3rd $ is the `salt`. The rest is the `hash`. You can ignore the beginning.
    Example: `$2b$10$abcdefghijklmnopqrstuvWXYZ123456789` => `salt` is `abcdefghijklmnopqrstuv` and `hash` is `WXYZ12345678`
    - Store the `hash` in `hash` and `salt` in `salt` in the user document.
    
 If it doesn't work, simply alter Vulcan Next password check method so it fall back to `services.password.bcrypt` to find the hashed password, see https://willvincent.com/2018/08/09/replicating-meteors-password-hashing-implementation/
 
 Example structure of a user:
 ```json
 {
 "_id":"RXSk3HJemC6haii64",
 "username":"administrator",
 "email":"admin@vulcanjs.org",
 "isDummy":false,
 "groups":["admins"],
 "isAdmin":true,
"emails":[{"address":"admin@vulcanjs.org"}],
"createdAt":{"$date":"2021-12-29T11:43:29.772Z"},
"displayName":"administrator",
"slug":"administrator",
// admin1234
 "services": {
        "password": {
            "bcrypt": "$2b$10$vxNlPs/AJdIYlypKCp7RVOiFNcc0I8ay6xj0TTXnA94rh5SSn.I8W"
        }
"status":{"online":false}}
 ```
 
 Example code:
 ```ts
 export const checkPasswordForUser = (
  user: Pick<UserTypeServer, "hash" | "salt">,
  passwordToTest: string
): boolean => {

  //legacy meteor start
  const userInput = crypto
  .Hash('sha256')
  .update(passwordToTest)
  .digest('hex')

  if(bcrypt.compareSync(userInput, `$2b$10$${user.salt}${user.hash}`)){
    console.log('match')
    const passwordsMatch = user.hash;
    return passwordsMatch;
  }//legacy meteor end

  const hash = (crypto as any)
    .pbkdf2Sync(userInput, user.salt, 1000, 64, "sha512")
    .toString("hex");

  const passwordsMatch = user.hash === hash;
  return passwordsMatch;
};
```


- You can use both Next's GraphQL API and Meteor's GraphQL API using the [Connect to multiple graphql API in the frontend pattern described here](https://github.com/VulcanJS/vulcan-next/blob/demo/with-meteor-backend/src/content/docs/recipes.md)
- TODO: See https://github.com/VulcanJS/vulcan-npm/issues/63. 
Meteor uses string `_id` as a default, while Mongo uses `ObjectId` type, so you need to do `ObjectId.str` to get the actual id or use a method like `isEqual` from lodash. **This means that objects created using Next backend might create bugs in the Meteor backend**. You need to avoid that, by doing creation operations only in Meteor, or to clearly separate things you manage in Next and things you manage in Meteor until you have fully transitionned.

### Reuse the meteor database 

- If you plan to reuse your existing Meteor database in Next, this means you might need to parse all documents and change the "string" `_id` to an `ObjectId`, see https://forums.meteor.com/t/convert-meteor-mongo-string--id-into-objectid/19782.
You can change the `_id` generation scheme (see https://docs.meteor.com/api/collections.html) to ObjectId in the Meteor app if you need a progressive transition.
TODO: We still have an issue with `function convertIdAndTransformToJSON<TModel>`, it tries to access `document._id` for string conversion but it seems to be undefined when using a Meteor Mongo database.
**Current workaround:**: clone users mnually in Compass, it will recreate an id as an ObjectID https://docs.mongodb.com/compass/current/documents/clone/
**Better workaround**: force mongoose to use string ids in the Vulcan Next model https://forums.meteor.com/t/using-mongoose-to-query-a-mongo-db-that-was-from-a-meteor-db/53789


## Caveats

- Check Vulcan NPM migration documentation to see the difference between Vulcan Meteor and Vulcan Next: https://github.com/VulcanJS/vulcan-npm/blob/devel/MIGRATING.md
