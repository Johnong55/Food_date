import { ArrowLeft, LoaderCircle, SearchX, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RelaxationSuggestion } from "@/features/discovery/search-contract";
import type { FoodSearchDraft } from "@/features/discovery/types";

type EmptySearchResultsProps = {
  draft: FoodSearchDraft;
  suggestions: RelaxationSuggestion[];
  isSearching: boolean;
  error: string | null;
  onEdit: () => void;
  onRelax: (suggestion: RelaxationSuggestion) => void;
  onRetry: () => void;
};

export function EmptySearchResults({
  draft,
  suggestions,
  isSearching,
  error,
  onEdit,
  onRelax,
  onRetry,
}: EmptySearchResultsProps) {
  return (
    <main className="min-h-[calc(100svh-5rem)] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Sửa tiêu chí">
        <ArrowLeft />
      </Button>

      <section className="mx-auto mt-8 max-w-sm text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-secondary text-primary">
          <SearchX className="size-9" />
        </span>
        <p className="mt-6 text-sm font-bold text-primary">Không có quán khớp hoàn toàn</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.04em]">
          Mình nới một tiêu chí nhé?
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Khu vực hiện tại: {draft.location.label}. Chỉ thay đổi lựa chọn bạn bấm bên dưới.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
            {error}
            <Button
              className="mt-2 w-full"
              variant="outline"
              onClick={onRetry}
              disabled={isSearching}
            >
              Thử tìm lại
            </Button>
          </div>
        )}

        {!error && (
          <div className="mt-6 space-y-3">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.filter}
                className="w-full justify-between"
                variant="outline"
                onClick={() => onRelax(suggestion)}
                disabled={isSearching}
              >
                {suggestion.label}
                {isSearching ? <LoaderCircle className="animate-spin" /> : <span>→</span>}
              </Button>
            ))}
          </div>
        )}

        <Card className="mt-6 text-left">
          <CardContent className="flex items-start gap-3 p-4 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <p>
              Ngân sách tối đa và yêu cầu ăn kiêng vẫn được giữ nguyên. App không tự nới các
              hard constraints này.
            </p>
          </CardContent>
        </Card>

        <Button className="mt-5" variant="ghost" onClick={onEdit} disabled={isSearching}>
          Chỉnh tất cả tiêu chí
        </Button>
      </section>
    </main>
  );
}
