-- SQL Migration: Add staff_ids array to meetings for multi-staff assignment
-- Run this in your Supabase SQL Editor if column does not exist yet.

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS staff_ids UUID[] DEFAULT '{}';
