import { ArrowLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type WizardHeaderProps = {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onReset: () => void;
};

export function WizardHeader({
  currentStep,
  totalSteps,
  onBack,
  onReset,
}: WizardHeaderProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <header className="sticky top-0 z-30 -mx-4 bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Quay lại">
          <ArrowLeft />
        </Button>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Bước {currentStep + 1}/{totalSteps}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          aria-label="Chọn lại từ đầu"
        >
          <RotateCcw />
        </Button>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label="Tiến độ chọn tiêu chí"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep + 1}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
