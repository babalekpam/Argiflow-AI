import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Microscope } from "lucide-react";
import SalesIntelligencePage from "./sales-intelligence";
import LeadIntelligencePage from "./lead-intelligence";

export default function UnifiedIntelligencePage() {
  const [tab, setTab] = useState("sales");

  return (
    <div data-testid="unified-intelligence-page">
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-page-title">Intelligence</h1>
          <p className="text-muted-foreground">B2B search, lead discovery, and enrichment tools.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="intelligence-tabs">
            <TabsTrigger value="sales" className="gap-2" data-testid="tab-sales">
              <Search className="w-4 h-4" />
              Sales Intelligence
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2" data-testid="tab-leads">
              <Microscope className="w-4 h-4" />
              Lead Discovery
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sales"><SalesIntelligencePage /></TabsContent>
          <TabsContent value="leads"><LeadIntelligencePage /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
