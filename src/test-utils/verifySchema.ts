/**
 * Schema Verification Utility (Stubbed)
 * -----------------------------------------------
 * Schema verification stubs.
 * With the Rust backend, schema is managed by SQLx migrations
 * so client-side schema verification is no longer needed.
 * All functions return successful dummy results for backward compatibility.
 */

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface SchemaVerificationResult {
  tableName: string;
  exists: boolean;
  columns: SchemaColumn[];
  matches: boolean;
  discrepancies: string[];
  sampleData?: Record<string, unknown>;
}

export interface StorageBucketVerificationResult {
  bucketName: string;
  exists: boolean;
  accessible: boolean;
  public: boolean;
  discrepancies: string[];
}

function stubResult(tableName: string): SchemaVerificationResult {
  return {
    tableName,
    exists: true,
    columns: [],
    matches: true,
    discrepancies: [],
  };
}

function stubBucketResult(bucketName: string): StorageBucketVerificationResult {
  return {
    bucketName,
    exists: true,
    accessible: true,
    public: true,
    discrepancies: [],
  };
}

export async function verifyPollVotesSchema(): Promise<SchemaVerificationResult> {
  return stubResult('poll_votes');
}

export async function verifyPollsSchema(): Promise<SchemaVerificationResult> {
  return stubResult('polls');
}

export async function verifyChatMessagesSchema(): Promise<SchemaVerificationResult> {
  return stubResult('chatmessages');
}

export async function verifyAlertsSchema(): Promise<SchemaVerificationResult> {
  return stubResult('alerts');
}

export async function verifyRoomsSchema(): Promise<SchemaVerificationResult> {
  return stubResult('rooms');
}

export async function verifyUsersSchema(): Promise<SchemaVerificationResult> {
  return stubResult('users');
}

export async function verifyUserThemesSchema(): Promise<SchemaVerificationResult> {
  return stubResult('user_themes');
}

export async function verifyAllCriticalTables(): Promise<{
  chatmessages: SchemaVerificationResult;
  alerts: SchemaVerificationResult;
  polls: SchemaVerificationResult;
  pollVotes: SchemaVerificationResult;
  rooms: SchemaVerificationResult;
  users: SchemaVerificationResult;
  userThemes: SchemaVerificationResult;
  allMatch: boolean;
  summary: {
    totalTables: number;
    tablesExist: number;
    tablesMatch: number;
    tablesWithIssues: number;
  };
}> {
  return {
    chatmessages: stubResult('chatmessages'),
    alerts: stubResult('alerts'),
    polls: stubResult('polls'),
    pollVotes: stubResult('poll_votes'),
    rooms: stubResult('rooms'),
    users: stubResult('users'),
    userThemes: stubResult('user_themes'),
    allMatch: true,
    summary: {
      totalTables: 7,
      tablesExist: 7,
      tablesMatch: 7,
      tablesWithIssues: 0,
    },
  };
}

/**
 * @deprecated Use verifyAllCriticalTables() for comprehensive verification
 */
export async function verifyPollSchemas(): Promise<{
  pollVotes: SchemaVerificationResult;
  polls: SchemaVerificationResult;
  allMatch: boolean;
}> {
  return {
    pollVotes: stubResult('poll_votes'),
    polls: stubResult('polls'),
    allMatch: true,
  };
}

export async function verifyStorageBucket(bucketName: string): Promise<StorageBucketVerificationResult> {
  return stubBucketResult(bucketName);
}

export async function verifyAllStorageBuckets(): Promise<{
  chatUploads: StorageBucketVerificationResult;
  alertMedia: StorageBucketVerificationResult;
  files: StorageBucketVerificationResult;
  allExist: boolean;
  allAccessible: boolean;
  summary: {
    totalBuckets: number;
    bucketsExist: number;
    bucketsAccessible: number;
  };
}> {
  return {
    chatUploads: stubBucketResult('chatUploads (files)'),
    alertMedia: stubBucketResult('alert-media'),
    files: stubBucketResult('files'),
    allExist: true,
    allAccessible: true,
    summary: {
      totalBuckets: 3,
      bucketsExist: 3,
      bucketsAccessible: 3,
    },
  };
}
