-- Migration: Add missing legacy columns to 'eventos' to support sync triggers
-- Date: 2026-01-18

DO $$ 
BEGIN
    -- Ensure respMetre exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respMetre') THEN
        ALTER TABLE eventos ADD COLUMN "respMetre" TEXT;
    END IF;

    -- Ensure respCocinaPase exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respCocinaPase') THEN
        ALTER TABLE eventos ADD COLUMN "respCocinaPase" TEXT;
    END IF;

    -- Optional: Add phone/mail if they are used in other views
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respMetrePhone') THEN
        ALTER TABLE eventos ADD COLUMN "respMetrePhone" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respMetreMail') THEN
        ALTER TABLE eventos ADD COLUMN "respMetreMail" TEXT;
    END IF;

    -- Ensure respProjectManager exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respProjectManager') THEN
        ALTER TABLE eventos ADD COLUMN "respProjectManager" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respProjectManagerPhone') THEN
        ALTER TABLE eventos ADD COLUMN "respProjectManagerPhone" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eventos' AND COLUMN_NAME = 'respProjectManagerMail') THEN
        ALTER TABLE eventos ADD COLUMN "respProjectManagerMail" TEXT;
    END IF;

END $$;
