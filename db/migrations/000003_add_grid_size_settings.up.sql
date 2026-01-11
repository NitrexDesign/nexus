-- Add grid size options to widget_settings
ALTER TABLE widget_settings ADD COLUMN grid_cols INTEGER DEFAULT 4;
ALTER TABLE widget_settings ADD COLUMN grid_rows INTEGER DEFAULT 6;
