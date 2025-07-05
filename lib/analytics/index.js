// Analytics Logger - Environment-aware implementation
// Automatically uses SQLite for development, PostgreSQL for production

import { logAnalysisData as logPostgres, logSearchData as logSearchPostgres, logBatchAnalysis as logBatchPostgres } from './logger.js';
import { logAnalysisData as logSQLite, logSearchData as logSearchSQLite, logBatchAnalysis as logBatchSQLite } from './logger-sqlite.js';

// Determine which database to use based on environment
function usePostgreSQL() {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export async function logAnalysisData(analysisData) {
  if (usePostgreSQL()) {
    return logPostgres(analysisData);
  } else {
    return logSQLite(analysisData);
  }
}

export async function logSearchData(searchData) {
  if (usePostgreSQL()) {
    return logSearchPostgres(searchData);
  } else {
    return logSearchSQLite(searchData);
  }
}

export async function logBatchAnalysis(analysisResults) {
  if (usePostgreSQL()) {
    return logBatchPostgres(analysisResults);
  } else {
    return logBatchSQLite(analysisResults);
  }
}

export async function initializeAnalyticsDB() {
  if (usePostgreSQL()) {
    const { initializeAnalyticsDB: initPostgres } = await import('./logger.js');
    return initPostgres();
  } else {
    const { initializeAnalyticsDB: initSQLite } = await import('./logger-sqlite.js');
    return initSQLite();
  }
}

// Export database type for API endpoints
export function getDatabaseType() {
  return usePostgreSQL() ? 'postgresql' : 'sqlite';
}