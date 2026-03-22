"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProgressStep {
  step: string;
  label: string;
  progress: number;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep: string;
  onCancel?: () => void;
}

const STEP_LABELS: Record<string, string> = {
  loading_data: "Loading data",
  preparing_data: "Preparing panel data",
  fitting_models: "Fitting statistical models",
  permutation_test: "Running permutation test",
  computing_metrics: "Computing business metrics",
  saving_results: "Saving results",
};

const TOTAL_STEPS = Object.keys(STEP_LABELS).length;

export function ProgressTracker({ steps, currentStep, onCancel }: ProgressTrackerProps) {
  const completedSteps = steps.filter((s) => s.progress >= 1).length;
  const overallProgress = Math.round((completedSteps / TOTAL_STEPS) * 100);

  // Estimate time remaining based on which step we're on
  const etaText =
    currentStep === "permutation_test"
      ? "This step takes the longest \u2014 usually 30\u201390 seconds"
      : currentStep === "fitting_models"
        ? "Fitting 4 statistical models..."
        : overallProgress >= 80
          ? "Almost done..."
          : "Usually takes 1\u20132 minutes total";

  return (
    <Card>
      <CardContent className="py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8F0E8] mb-3">
              <svg
                className="w-6 h-6 text-[#7A9E7E] animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="font-semibold text-lg">Running Analysis</p>
            <p className="text-sm text-muted-foreground">
              {STEP_LABELS[currentStep] || currentStep}...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {etaText}
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.step} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={
                      step.progress >= 1
                        ? "text-[#3D6B42]"
                        : step.step === currentStep
                        ? "font-medium text-[#0B1D2E]"
                        : "text-muted-foreground"
                    }
                  >
                    {step.progress >= 1 && "\u2713 "}
                    {STEP_LABELS[step.step] || step.step}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(step.progress * 100)}%
                  </span>
                </div>
                <Progress value={step.progress * 100} className="h-1.5" />
              </div>
            ))}
          </div>

          {onCancel && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
