// example script to migrate password from the db
// This is just an example and will need enhancement
const {MongoClient} = require('mongodb');
​
const dbName = 'your-db-name'
const connectionString = 'mongodb://localhost:27017/' + dbName
​
/**
 * Migrate vulcan meteor accounts to vulcan-next
 *
 * 
 * Run `node migration.js -u` to update users
 *
 * 1. A user.salt and user.hash will be made from meteor bcrypt password, which 
 * will allow you to log in with existing password with a meteor fallback patch on vulcan-next
 * 
 * 
 */
​
async function main(){
    /**
     * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
     * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
     */ 
    const client = new MongoClient(connectionString);
 
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        // Make the appropriate DB calls
        var listdbs, updateUsers = false
        //check args https://stackoverflow.com/questions/4351521/how-do-i-pass-command-line-arguments-to-a-node-js-program
        await process.argv.forEach(async function (val, index, array) {
            if(val=='-ls'){
                listdbs = true
            }
            if(val=='-u'){
                updateUsers = true
            }
        });
        
        if(listdbs){
            await listDatabases(client);
        }
​
        //prepare user for migration
        if(updateUsers){
          await updateAllUsers(client)
          console.log('done')
        }
 
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
​
​
/**
 * updateAllUsers
 * 
 * 
 * @param {MongoClient} client A MongoClient that is connected to a cluster with the sample_airbnb database
 */
async function updateAllUsers(client) {
    // See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateMany for the updateMany() docs
    //find all users, and convert to array so we can use for loop (foreach cannot use await)
    const users = await client.db(dbName).collection("users").find().toArray()
​
    console.log(`found ${users.length} users`)
    let resultCount = 0
    for(var x= 0;x<users.length;x++){
        await updateUser(client, users[x]._id)
        resultCount+=1
    }
    console.log(`${resultCount} document(s) was/were updated.`);
}
​
​
/**
 * Update meteor user so it'll work with vulcan-next
 * @Params client, meteorId (the user's meteor id)
 * 
 * 1. Fetches the bcypt password, and inserts user.salt user.hash
 * 2. Adds user.legacyId so we can keep a reference to meteor ids
 */
async function updateUser(client, meteorId){
     //get their password
    const bcryptPassword = await retrievePassword(client, meteorId)
    //create salt and hash
    const salt = bcryptPassword.substring(7,29)
    const hash = bcryptPassword.substring(29)
    console.log(`salt: ${salt}, hash: ${hash}`)
​
    await updateListingById(client, meteorId, 
        {
        "legacyId":meteorId,
        "salt":salt,
        "hash":hash
        }
    ) 
}
​
/**************************************
************* MONGO HELPERS ********************
***************************************/
/**
 * Note: If more than one listing has the same name, only the first listing the database finds will be updated.
 * @param {MongoClient} client A MongoClient that is connected to a cluster with the sample_airbnb database
 * @param {string} nameOfListing The name of the listing you want to update
 * @param {object} updatedListing An object containing all of the properties to be updated for the given listing
 */
async function updateListingById(client, id, updatedListing) {
    // See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateOne for the updateOne() docs
    const result = await client.db(dbName).collection("users").updateOne({ _id: id }, { $set: updatedListing });
    //use unset to remove fields:
    // const resultb = await client.db(dbName).collection("users").updateOne({ _id: id }, { $unset: {legacy:1} });
​
    console.log(`${result.matchedCount} document(s) matched the query criteria.`);
    console.log(`${result.modifiedCount} document(s) was/were updated.`);
}
​
​
async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();
 
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};
​
​
async function createListing(client, newListing){
    const result = await client.db(dbName).collection("users").insertOne(newListing);
    console.log(`New listing created with the following id: ${result.insertedId}`);
}
​
​
​
​
/**
get user's bcypt password
 */
async function retrievePassword(client, id) {
    // See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOne for the findOne() docs
    const result = await client.db(dbName).collection("users").findOne({ _id: id });
​
    if (result) {
        console.log(`Found a listing in the db with the name '${result.username}':`);
        console.log(result);
    } else {
        console.log(`No listings found with the name '${result.username}'`);
    }
    return result.services.password.bcrypt
}
​
main().catch(console.error);
