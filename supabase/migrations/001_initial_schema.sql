-- LiftProof Initial Schema
-- Uses Supabase Auth for users (auth.users table)

CREATE TABLE public.csv_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    row_count INTEGER,
    geo_granularity TEXT,
    date_column TEXT,
    date_format TEXT,
    date_range_start DATE,
    date_range_end DATE,
    geo_column TEXT,
    kpi_columns TEXT[],
    spend_column TEXT,
    validation_status TEXT DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.experiments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    csv_upload_id UUID REFERENCES public.csv_uploads(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    experiment_type TEXT DEFAULT 'fixed_geo',
    hypothesis TEXT,
    primary_kpi TEXT NOT NULL,
    secondary_kpis TEXT[],
    geo_granularity TEXT NOT NULL,
    treatment_geos TEXT[] NOT NULL,
    control_geos TEXT[] NOT NULL,
    treatment_start DATE NOT NULL,
    treatment_end DATE NOT NULL,
    pre_period_start DATE NOT NULL,
    pre_period_end DATE NOT NULL,
    spend_column TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.experiment_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
    kpi TEXT NOT NULL,
    lift_amount DOUBLE PRECISION,
    lift_percent DOUBLE PRECISION,
    ci_lower DOUBLE PRECISION,
    ci_upper DOUBLE PRECISION,
    p_value DOUBLE PRECISION,
    incrementality_factor DOUBLE PRECISION,
    iroas DOUBLE PRECISION,
    cpia DOUBLE PRECISION,
    statistical_power DOUBLE PRECISION,
    model_weights JSONB,
    synthetic_control_series JSONB,
    treatment_series JSONB,
    cumulative_lift_series JSONB,
    ci_lower_series JSONB,
    ci_upper_series JSONB,
    placebo_distribution JSONB,
    dates JSONB,
    pre_period_fit_rmse DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own uploads"
    ON public.csv_uploads FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own experiments"
    ON public.experiments FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can read own results"
    ON public.experiment_results FOR ALL
    USING (
        experiment_id IN (
            SELECT id FROM public.experiments WHERE user_id = auth.uid()
        )
    );

-- Storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-uploads', 'csv-uploads', false);

CREATE POLICY "Users can upload own CSVs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own CSVs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
