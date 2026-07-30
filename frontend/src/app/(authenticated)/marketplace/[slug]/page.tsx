import { MarketplaceDetailPage } from "@/features/marketplace/components/marketplace-detail-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [
    { slug: "ml" },
    { slug: "shopee" },
    { slug: "amazon" },
    { slug: "magalu" },
    { slug: "tiktok" },
  ];
}

export default async function MarketplaceDetailRoute({ params }: PageProps) {
  const { slug } = await params;
  return <MarketplaceDetailPage slug={slug} />;
}
