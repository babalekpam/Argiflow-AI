import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, Bot, Zap } from "lucide-react";
import AgentCatalogPage from "./agent-catalog";
import AiAgentsPage from "./ai-agents";
import AgentConsolePage from "./agent-console";

export default function UnifiedAgentsPage() {
  const [tab, setTab] = useState("catalog");

  return (
    <div data-testid="unified-agents-page">
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-page-title">AI Agents</h1>
          <p className="text-muted-foreground">Browse, monitor, and run your AI agents from one place.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="agents-tabs">
            <TabsTrigger value="catalog" className="gap-2" data-testid="tab-catalog">
              <Boxes className="w-4 h-4" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2" data-testid="tab-monitor">
              <Bot className="w-4 h-4" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="console" className="gap-2" data-testid="tab-console">
              <Zap className="w-4 h-4" />
              Console
            </TabsTrigger>
          </TabsList>
          <TabsContent value="catalog"><AgentCatalogPage /></TabsContent>
          <TabsContent value="monitor"><AiAgentsPage /></TabsContent>
          <TabsContent value="console"><AgentConsolePage /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
