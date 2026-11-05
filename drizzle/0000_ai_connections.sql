CREATE TABLE ai_transactions (
 state TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL,
 binding TEXT NOT NULL,
 payload TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE ai_connections (
 user_id TEXT PRIMARY KEY NOT NULL,
 credential TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 locked_until INTEGER DEFAULT 0 NOT NULL,
 inference_until INTEGER DEFAULT 0 NOT NULL
);
