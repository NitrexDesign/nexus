-- Remove grid size options from widget_settings
ALTER TABLE widget_settings DROP COLUMN grid_cols;
ALTER TABLE widget_settings DROP COLUMN grid_rows;
