import type { Metadata } from "next";

import { ComingSoonPage } from "@/components/coming-soon-page";
import { FoodPreferenceWizard } from "@/features/discovery/components/food-preference-wizard";

export const metadata: Metadata = {
  title: "Khám phá",
  description: "Chọn món, mood, ngân sách và khu vực phù hợp cho buổi hẹn.",
};

const futureIntents: Record<string, { title: string; description: string }> = {
  drink: {
    title: "Uống gì hôm nay?",
    description: "Cafe, trà, cocktail và các địa điểm uống sẽ được mở sau MVP tìm quán ăn.",
  },
  date: {
    title: "Một buổi date thật vui",
    description: "Gợi ý hoạt động và địa điểm hẹn hò sẽ được thêm sau khi discovery đồ ăn hoạt động ổn định.",
  },
  play: {
    title: "Chơi gì cùng nhau?",
    description: "Game, workshop và hoạt động nhóm đang nằm trong roadmap sau MVP.",
  },
  movie: {
    title: "Tối nay xem gì?",
    description: "Lịch chiếu và gợi ý phim sẽ được phát triển trong phase hoạt động.",
  },
  place: {
    title: "Mình đi đâu đây?",
    description: "Công viên, triển lãm và điểm đi chơi sẽ được thêm sau trải nghiệm tìm quán.",
  },
};

type ExplorePageProps = {
  searchParams: Promise<{ intent?: string }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { intent } = await searchParams;
  const futureIntent = intent ? futureIntents[intent] : undefined;

  if (futureIntent) {
    return (
      <ComingSoonPage
        eyebrow="Sau MVP"
        title={futureIntent.title}
        description={futureIntent.description}
      />
    );
  }

  return (
    <FoodPreferenceWizard initialMode={intent === "random" ? "random" : "food"} />
  );
}
