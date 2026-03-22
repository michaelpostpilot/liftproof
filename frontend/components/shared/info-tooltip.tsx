"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  content: string;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="inline-flex items-center text-muted-foreground hover:text-foreground ml-1 align-middle"
        onClick={(e) => e.preventDefault()}
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
