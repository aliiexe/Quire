import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { EditorStory } from "@/components/marketing/EditorStory";
import { PreviewStory } from "@/components/marketing/PreviewStory";
import { AutoCompileStory } from "@/components/marketing/AutoCompileStory";
import { LocalFirst } from "@/components/marketing/LocalFirst";
import { FeatureBento } from "@/components/marketing/FeatureBento";
import { OpenSource } from "@/components/marketing/OpenSource";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Footer } from "@/components/marketing/Footer";
import { SmoothScroll } from "@/components/marketing/SmoothScroll";

export default function MarketingPage() {
  return (
    <SmoothScroll>
      <div className="flex min-h-screen flex-col bg-[var(--quire-bg)]">
        <Navbar />
        <main className="flex-1 overflow-x-hidden">
          <Hero />
          <EditorStory />
          <PreviewStory />
          <AutoCompileStory />
          <LocalFirst />
          <FeatureBento />
          <OpenSource />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
