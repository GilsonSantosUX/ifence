/*
  Warnings:

  - You are about to alter the column `value` on the `AppSettings` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `coordinates` on the `GeofencePin` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `center` on the `Perimeter` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `coordinates` on the `Perimeter` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `actionConfig` on the `Rule` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL
);
INSERT INTO "new_AppSettings" ("id", "value") SELECT "id", "value" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE TABLE "new_GeofencePin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fenceId" INTEGER NOT NULL,
    "responsibleId" INTEGER,
    "name" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" DATETIME,
    "actionType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeofencePin_fenceId_fkey" FOREIGN KEY ("fenceId") REFERENCES "Geofence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeofencePin_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GeofencePin" ("actionType", "coordinates", "createdAt", "dueDate", "fenceId", "id", "name", "responsibleId", "status") SELECT "actionType", "coordinates", "createdAt", "dueDate", "fenceId", "id", "name", "responsibleId", "status" FROM "GeofencePin";
DROP TABLE "GeofencePin";
ALTER TABLE "new_GeofencePin" RENAME TO "GeofencePin";
CREATE TABLE "new_Perimeter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fenceId" INTEGER NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "coordinates" JSONB,
    "center" JSONB,
    "radius" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Perimeter_fenceId_fkey" FOREIGN KEY ("fenceId") REFERENCES "Geofence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Perimeter" ("center", "coordinates", "createdAt", "fenceId", "id", "name", "radius", "type") SELECT "center", "coordinates", "createdAt", "fenceId", "id", "name", "radius", "type" FROM "Perimeter";
DROP TABLE "Perimeter";
ALTER TABLE "new_Perimeter" RENAME TO "Perimeter";
CREATE TABLE "new_Rule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fenceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionConfig" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rule_fenceId_fkey" FOREIGN KEY ("fenceId") REFERENCES "Geofence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Rule" ("action", "actionConfig", "condition", "createdAt", "fenceId", "id", "isDefault", "name") SELECT "action", "actionConfig", "condition", "createdAt", "fenceId", "id", "isDefault", "name" FROM "Rule";
DROP TABLE "Rule";
ALTER TABLE "new_Rule" RENAME TO "Rule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
