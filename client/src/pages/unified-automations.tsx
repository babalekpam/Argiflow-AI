import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, Zap } from "lucide-react";
import AutomationsPage from "./automations";
import WorkflowBuilder from "./workflow-builder";

export default function UnifiedAutomationsPage() {
  const [tab, setTab] = useState("automations");

  return (
    <div data-testid="unified-automations-page">
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-page-title">Automations</h1>
          <p className="text-muted-foreground">Manage templates and build custom workflows.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="automations-tabs">
            <TabsTrigger value="automations" className="gap-2" data-testid="tab-automations">
              <Zap className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-2" data-testid="tab-builder">
              <Workflow className="w-4 h-4" />
              Workflow Builder
            </TabsTrigger>
          </TabsList>
          <TabsContent value="automations"><AutomationsPage /></TabsContent>
          <TabsContent value="builder"><WorkflowBuilder /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
