import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, BarChart3, FileText } from "lucide-react";
import EmailSmsPage from "./email-sms";
import EmailDashboard from "./email-dashboard";
import EmailLogsPage from "./email-logs";

export default function UnifiedEmailPage() {
  const [tab, setTab] = useState("outreach");

  return (
    <div data-testid="unified-email-page">
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-page-title">Email & Outreach</h1>
          <p className="text-muted-foreground">Send emails, track quotas, and monitor delivery.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="email-tabs">
            <TabsTrigger value="outreach" className="gap-2" data-testid="tab-outreach">
              <Mail className="w-4 h-4" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="quotas" className="gap-2" data-testid="tab-quotas">
              <BarChart3 className="w-4 h-4" />
              Quotas & Sending
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
              <FileText className="w-4 h-4" />
              Delivery Logs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outreach"><EmailSmsPage /></TabsContent>
          <TabsContent value="quotas"><EmailDashboard /></TabsContent>
          <TabsContent value="logs"><EmailLogsPage /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
