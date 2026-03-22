from __future__ import annotations

import io
import pandas as pd
from supabase import create_client
from app.config import settings


class DataService:
    def __init__(self):
        self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    def load_experiment_data(self, experiment_id: str, user_id: str | None = None) -> tuple[pd.DataFrame, dict, dict]:
        """
        Load CSV data and experiment config from Supabase.

        Returns:
            (dataframe, experiment_record, upload_record)
        """
        # Fetch experiment record (filtered by user_id if provided)
        query = self.supabase.table("experiments").select("*").eq("id", experiment_id)
        if user_id:
            query = query.eq("user_id", user_id)
        experiment = query.single().execute()

        # Fetch CSV upload record
        upload = (
            self.supabase.table("csv_uploads")
            .select("*")
            .eq("id", experiment.data["csv_upload_id"])
            .single()
            .execute()
        )

        # Download CSV from storage
        file_bytes = self.supabase.storage.from_("csv-uploads").download(
            upload.data["storage_path"]
        )

        # Parse into DataFrame
        df = pd.read_csv(io.BytesIO(file_bytes))

        return df, experiment.data, upload.data

    def save_results(self, experiment_id: str, results: dict) -> None:
        """Save analysis results to Supabase."""
        # Insert result record
        self.supabase.table("experiment_results").insert(
            {
                "experiment_id": experiment_id,
                **results,
            }
        ).execute()

        # Update experiment status
        self.supabase.table("experiments").update({"status": "completed"}).eq(
            "id", experiment_id
        ).execute()

    def mark_failed(self, experiment_id: str, error_message: str) -> None:
        """Mark experiment as failed."""
        self.supabase.table("experiments").update(
            {"status": "failed"}
        ).eq("id", experiment_id).execute()
