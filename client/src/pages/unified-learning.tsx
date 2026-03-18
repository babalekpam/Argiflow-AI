import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Library, BookOpen } from "lucide-react";
import TrainingPage from "./training";
import ResourcesPage from "./resources";
import PlatformGuidePage from "./platform-guide";

export default function UnifiedLearningPage() {
  const [tab, setTab] = useState("training");

  return (
    <div data-testid="unified-learning-page">
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-page-title">Learning Center</h1>
          <p className="text-muted-foreground">Courses, templates, and growth guides.</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="learning-tabs">
            <TabsTrigger value="training" className="gap-2" data-testid="tab-training">
              <GraduationCap className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2" data-testid="tab-resources">
              <Library className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2" data-testid="tab-guide">
              <BookOpen className="w-4 h-4" />
              Growth Guide
            </TabsTrigger>
          </TabsList>
          <TabsContent value="training"><TrainingPage /></TabsContent>
          <TabsContent value="resources"><ResourcesPage /></TabsContent>
          <TabsContent value="guide"><PlatformGuidePage /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
