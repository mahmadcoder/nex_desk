-- SQL Migration: Add visible_to_staff to project_files
-- Run this in your Supabase SQL Editor if column does not exist yet.

ALTER TABLE project_files
ADD COLUMN IF NOT EXISTS visible_to_staff BOOLEAN NOT NULL DEFAULT true;
