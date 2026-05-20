import HeroSectionOne from "@/components/ui/hero-section-demo-1";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        <HeroSectionOne />
      </ErrorBoundary>
    </div>
  );
}
