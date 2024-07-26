

const { MongoClient } = require('mongodb');

module.exports = { connectToDatabase, getDatabase, disconnectDatabase }

var db;
var clientDB;


function connectToDatabase(callbackFonction) {
	MongoClient.connect('mongodb://localhost:27017/AIPL')
		.then(client => {
			clientDB = client;
			db = client.db();
			callbackFonction();
		})
		.catch(error => {
			console.log(error)
			callbackFonction(error);
		});
}



function getDatabase() {
	return db;
}


function disconnectDatabase() {
	clientDB.close();
}
