import { AutoScrollProducts } from "@/components/homePage/AutoScrollProducts";
import { FoodCategoryList } from "@/components/homePage/FoodCategoryList";
import { HeroCategoryStrip } from "./HeroCategoryStrip";
import { HeroCarousel } from "@/components/HeroCarousel";
import { AIChat } from "@/components/aiChatBot/AIChat";
import { HomeFaqSection } from "@/components/homePage/HomeFaqSection";
import { HomeBlogSection } from "@/components/homePage/HomeBlogSection";

export default function Home() {
  return (
    <div className="w-screen min-h-screen bg-background text-foreground overflow-x-hidden">
      <HeroCarousel />
      <HeroCategoryStrip />
      <AutoScrollProducts />
      <FoodCategoryList />
      <HomeFaqSection />
      <HomeBlogSection />

      {/* AI Assistant */}
      <AIChat />
    </div>
  );
}
