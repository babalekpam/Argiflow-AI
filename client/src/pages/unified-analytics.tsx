import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Bot } from "lucide-react";
import AnalyticsPage from "./analytics";
import AiKpiPage from "./ai-kpi";

export default function UnifiedAnalyticsPage() {
  const [tab, setTab] = useState("campaigns");

  return (
    <div data-testid="unified-analytics-page">
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-page-title">Analytics</h1>
          <p className="text-muted-foreground">Campaign performance and AI agent metrics in one view.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="analytics-tabs">
            <TabsTrigger value="campaigns" className="gap-2" data-testid="tab-campaigns">
              <BarChart3 className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="ai-performance" className="gap-2" data-testid="tab-ai-performance">
              <Bot className="w-4 h-4" />
              AI Performance
            </TabsTrigger>
          </TabsList>
          <TabsContent value="campaigns"><AnalyticsPage /></TabsContent>
          <TabsContent value="ai-performance"><AiKpiPage /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
