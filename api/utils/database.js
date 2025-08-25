const mongoose = require('mongoose');

// MongoDB connection
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ryangupta2005:sVYyYSC2t71DYRuS@mitreddit.49830ky.mongodb.net/manipal_reddit', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  cachedConnection = connection;
  return connection;
}

module.exports = { connectToDatabase };
