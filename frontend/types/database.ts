export interface CsvUpload {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_size_bytes: number | null;
  row_count: number | null;
  geo_granularity: string | null;
  date_column: string | null;
  date_format: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  geo_column: string | null;
  kpi_columns: string[] | null;
  spend_column: string | null;
  validation_status: "pending" | "valid" | "invalid";
  validation_errors: unknown[];
  created_at: string;
}

export interface Experiment {
  id: string;
  user_id: string;
  csv_upload_id: string | null;
  name: string;
  status: "draft" | "running" | "completed" | "failed";
  experiment_type: "fixed_geo" | "standard_geo";
  hypothesis: string | null;
  primary_kpi: string;
  secondary_kpis: string[] | null;
  geo_granularity: string;
  treatment_geos: string[];
  control_geos: string[];
  treatment_start: string;
  treatment_end: string;
  pre_period_start: string;
  pre_period_end: string;
  spend_column: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentResult {
  id: string;
  experiment_id: string;
  kpi: string;
  lift_amount: number | null;
  lift_percent: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
  p_value: number | null;
  incrementality_factor: number | null;
  iroas: number | null;
  cpia: number | null;
  statistical_power: number | null;
  model_weights: Record<string, number> | null;
  synthetic_control_series: number[] | null;
  treatment_series: number[] | null;
  cumulative_lift_series: number[] | null;
  ci_lower_series: number[] | null;
  ci_upper_series: number[] | null;
  placebo_distribution: number[] | null;
  dates: string[] | null;
  pre_period_fit_rmse: number | null;
  created_at: string;
}
