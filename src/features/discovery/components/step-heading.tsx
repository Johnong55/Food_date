import type { ReactNode } from "react";

type StepHeadingProps = {
  titleId?: string;
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

export function StepHeading({
  titleId,
  eyebrow,
  title,
  description,
  aside,
}: StepHeadingProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-primary">{eyebrow}</p>
          <h1
            id={titleId}
            className="mt-1 text-3xl font-black leading-tight tracking-[-0.035em]"
          >
            {title}
          </h1>
        </div>
        {aside}
      </div>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
