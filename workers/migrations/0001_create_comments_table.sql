CREATE TABLE IF NOT EXISTS items (
    "id" TEXT PRIMARY KEY,
    "type" TEXT,
    "flag" TEXT,
    "from" TEXT,
    "to" TEXT,
    "cc" TEXT,
    "ref" TEXT,
    "data" BLOB NULL,
    "created_at" INTEGER,
    "updated_at" INTEGER
);