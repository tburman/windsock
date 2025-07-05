#!/usr/bin/env node

// Analytics Database Initialization Script
// Sets up SQLite for development or verifies PostgreSQL for production

// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeAnalyticsDB, getDatabaseType } from '../lib/analytics/index.js';

async function main() {
  console.log('🔧 Initializing Windsock Analytics Database...\n');
  
  const dbType = getDatabaseType();
  
  console.log(`📊 Database Type: ${dbType.toUpperCase()}`);
  
  if (dbType === 'sqlite') {
    console.log('📁 Creating data directory and SQLite database...');
    console.log('📊 Database will be created at: data/analytics.db');
  } else {
    console.log('🔗 Using PostgreSQL connection from environment variables');
    console.log('⚠️  Make sure you have run the SQL schema creation script!');
  }
  
  try {
    await initializeAnalyticsDB();
    
    console.log('\n✅ Analytics database initialized successfully!');
    
    if (dbType === 'sqlite') {
      console.log('\n📋 SQLite Setup Complete:');
      console.log('   • Database created at: data/analytics.db');
      console.log('   • Tables and indexes created');
      console.log('   • Views created for common queries');
      console.log('\n💡 The analytics system will now automatically log data to SQLite');
    } else {
      console.log('\n📋 PostgreSQL Setup Verified:');
      console.log('   • Connection established');
      console.log('   • Tables verified (or need to be created manually)');
      console.log('\n💡 Make sure to run sql/analytics_schema.sql on your PostgreSQL database');
    }
    
    console.log('\n🚀 You can now use the analytics features in your application!');
    
  } catch (error) {
    console.error('\n❌ Failed to initialize analytics database:');
    console.error(error.message);
    
    if (dbType === 'postgresql') {
      console.log('\n💡 Troubleshooting PostgreSQL:');
      console.log('   1. Check your DATABASE_URL or POSTGRES_URL environment variable');
      console.log('   2. Ensure your database is accessible');
      console.log('   3. Run the SQL schema script: sql/analytics_schema.sql');
    } else {
      console.log('\n💡 Troubleshooting SQLite:');
      console.log('   1. Check file permissions in the project directory');
      console.log('   2. Ensure you have write access to create the data/ directory');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);