const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Script to fix database indexes
 * Run this once to update indexes after schema changes
 */

const db_uri = process.env.DB_URI;

const fixIndexes = async () => {
  try {
    await mongoose.connect(db_uri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // Drop old unique index on 'name' field
    try {
      await collection.dropIndex("name_1");
      console.log("✅ Dropped old unique index on 'name' field");
    } catch (err) {
      if (err.code === 27 || err.message.includes("index not found")) {
        console.log("ℹ️  Index 'name_1' doesn't exist (already removed)");
      } else {
        console.error("Error dropping index:", err.message);
      }
    }

    // Drop old unique index on 'email' if it exists
    try {
      await collection.dropIndex("email_1");
      console.log("✅ Dropped old unique index on 'email' field");
    } catch (err) {
      if (err.code === 27 || err.message.includes("index not found")) {
        console.log("ℹ️  Index 'email_1' doesn't exist (already removed)");
      } else {
        console.error("Error dropping index:", err.message);
      }
    }

    // Drop old unique index on 'mobile' if it exists
    try {
      await collection.dropIndex("mobile_1");
      console.log("✅ Dropped old unique index on 'mobile' field");
    } catch (err) {
      if (err.code === 27 || err.message.includes("index not found")) {
        console.log("ℹ️  Index 'mobile_1' doesn't exist (already removed)");
      } else {
        console.error("Error dropping index:", err.message);
      }
    }

    // Create new indexes as per updated schema
    await collection.createIndex({ walletAddress: 1 }, { unique: true, sparse: true });
    console.log("✅ Created index on 'walletAddress' field");

    await collection.createIndex({ name: 1 }, { unique: false });
    console.log("✅ Created non-unique index on 'name' field");

    console.log("\n✅ Index migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing indexes:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

fixIndexes();
