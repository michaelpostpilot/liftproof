from __future__ import annotations

import io
import json
import numpy as np
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from supabase import create_client
from app.config import settings


class ExportService:
    def __init__(self):
        self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    def generate_pdf(self, experiment_id: str, user_id: str | None = None) -> bytes:
        """Generate a PDF report for an experiment's results."""
        # Fetch experiment and results (filtered by user_id for authorization)
        query = self.supabase.table("experiments").select("*").eq("id", experiment_id)
        if user_id:
            query = query.eq("user_id", user_id)
        experiment = query.single().execute().data

        result = (
            self.supabase.table("experiment_results")
            .select("*")
            .eq("experiment_id", experiment_id)
            .single()
            .execute()
        ).data

        # Build PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Title"],
            fontSize=24,
            spaceAfter=6,
        )
        heading_style = ParagraphStyle(
            "CustomHeading",
            parent=styles["Heading2"],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
        )
        body_style = styles["Normal"]

        story = []

        # Title
        story.append(Paragraph("LiftProof Experiment Report", title_style))
        story.append(Spacer(1, 12))

        # Experiment name and details
        story.append(Paragraph(experiment["name"], styles["Heading1"]))
        story.append(
            Paragraph(
                f"Type: {experiment['experiment_type']} | KPI: {experiment['primary_kpi']} | "
                f"Period: {experiment['treatment_start']} to {experiment['treatment_end']}",
                body_style,
            )
        )

        if experiment.get("hypothesis"):
            story.append(Spacer(1, 6))
            story.append(
                Paragraph(f'<i>Hypothesis: "{experiment["hypothesis"]}"</i>', body_style)
            )

        story.append(Spacer(1, 20))

        # Results summary
        story.append(Paragraph("Results Summary", heading_style))

        is_significant = result.get("p_value") is not None and result["p_value"] < 0.05
        verdict = "STATISTICALLY SIGNIFICANT" if is_significant else "NOT STATISTICALLY SIGNIFICANT"

        story.append(
            Paragraph(
                f"<b>Verdict: {verdict}</b> (p = {result.get('p_value', 'N/A'):.4f})"
                if result.get("p_value") is not None
                else "<b>Verdict: N/A</b>",
                body_style,
            )
        )
        story.append(Spacer(1, 12))

        # Metrics table
        metrics_data = [
            ["Metric", "Value"],
            ["Lift %", f"{result.get('lift_percent', 0) * 100:.1f}%"],
            [
                "Lift Amount",
                f"${result.get('lift_amount', 0):,.0f}",
            ],
            ["p-value", f"{result.get('p_value', 'N/A'):.4f}" if result.get("p_value") else "N/A"],
            [
                "95% CI",
                f"[{result.get('ci_lower', 0) * 100:.1f}%, {result.get('ci_upper', 0) * 100:.1f}%]"
                if result.get("ci_lower") is not None
                else "N/A",
            ],
        ]

        if result.get("iroas") is not None:
            metrics_data.append(["iROAS", f"{result['iroas']:.1f}x"])
        if result.get("cpia") is not None:
            metrics_data.append(["CPIA", f"${result['cpia']:.2f}"])

        table = Table(metrics_data, colWidths=[2.5 * inch, 3 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 11),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f9fafb")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 20))

        # Experiment configuration
        story.append(Paragraph("Experiment Configuration", heading_style))

        config_data = [
            ["Parameter", "Value"],
            ["Experiment Type", experiment["experiment_type"]],
            ["Geo Granularity", experiment["geo_granularity"]],
            ["Treatment Geos", ", ".join(experiment["treatment_geos"])],
            ["Control Geos", f"{len(experiment['control_geos'])} geos"],
            ["Pre-Period", f"{experiment['pre_period_start']} to {experiment['pre_period_end']}"],
            ["Treatment Period", f"{experiment['treatment_start']} to {experiment['treatment_end']}"],
        ]

        config_table = Table(config_data, colWidths=[2 * inch, 4 * inch])
        config_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#374151")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f9fafb")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(config_table)
        story.append(Spacer(1, 20))

        # Model weights
        if result.get("model_weights"):
            story.append(Paragraph("Model Ensemble Weights", heading_style))
            weights_data = [["Model", "Weight"]]
            for model, weight in sorted(
                result["model_weights"].items(), key=lambda x: x[1], reverse=True
            ):
                weights_data.append([model.replace("_", " ").title(), f"{weight * 100:.1f}%"])

            weights_table = Table(weights_data, colWidths=[3 * inch, 2 * inch])
            weights_table.setStyle(
                TableStyle(
                    [
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(weights_table)

        # Footer
        story.append(Spacer(1, 30))
        story.append(
            Paragraph(
                "Generated by LiftProof (by PostPilot). "
                "Statistical methodology: Augmented Synthetic Control Methods.",
                ParagraphStyle("footer", parent=body_style, fontSize=8, textColor=HexColor("#9ca3af")),
            )
        )

        doc.build(story)
        return buffer.getvalue()
