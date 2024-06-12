

const { MongoClient } = require('mongodb');

module.exports = { connectToDatabase, getDatabase }

var db;



function connectToDatabase(callbackFonction) {
	MongoClient.connect('mongodb://localhost:27017/AIPL')
		.then(client => {
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


