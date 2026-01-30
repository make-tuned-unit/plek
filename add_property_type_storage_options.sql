-- Add new property types for long-term storage (warehouses, barns, boats, RVs, etc.)
-- Keeps existing 'street' in enum for existing data; new listings cannot select it from UI.

ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'warehouse';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'barn';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'other';
