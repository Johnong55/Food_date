import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AuthCodeErrorPage() {
  return (
    <ComingSoonPage
      eyebrow="Đăng nhập"
      title="Chưa đăng nhập được"
      description="Phiên đăng nhập đã hết hạn hoặc cấu hình OAuth chưa hoàn tất. Bạn vẫn có thể tiếp tục dùng app ở chế độ khách."
    />
  );
}
