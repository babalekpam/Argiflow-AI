import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CampaignPreparationDialog } from "@/components/campaign-preparation-dialog";

interface SavedMailingBrief {
  businessContext: string | null;
  goals: string[];
  updatedAt: string | null;
  source: "business_manager";
  saved: boolean;
}

function formatUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return updatedAt;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "The server did not provide more details.";
}

export function SavedMailingBriefPanel() {
  const [prepareDialogOpen, setPrepareDialogOpen] = useState(false);
  const { data, isPending, isError, error } = useQuery<SavedMailingBrief>({
    queryKey: ["/api/aria/strategy-brief"],
  });

  const context = data?.businessContext?.trim();
  const goals = (data?.goals || [])
    .filter((goal): goal is string => typeof goal === "string" && goal.trim().length > 0)
    .map((goal) => goal.trim());

  return (
    <Card
      className="bg-gray-900/50 border-white/10"
      data-testid="saved-mailing-brief-panel"
      role="region"
      aria-labelledby="saved-mailing-brief-title"
      aria-describedby="saved-mailing-brief-description"
    >
      <CardHeader className="py-3 px-4 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle
            id="saved-mailing-brief-title"
            className="text-sm font-medium flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-sky-400" aria-hidden="true" />
            Saved mailing brief
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Read-only</span>
            <Button
              type="button"
              size="sm"
              onClick={() => setPrepareDialogOpen(true)}
              className="bg-sky-600 hover:bg-sky-700"
              data-testid="button-prepare-new-campaign"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Prepare new campaign
            </Button>
          </div>
        </div>
        <p id="saved-mailing-brief-description" className="text-xs text-gray-400">
          Business Manager uses this saved brief for new drafts and decisions. Viewing it does not start a campaign or send email.
        </p>
      </CardHeader>

      <CardContent className="p-4">
        {isPending && (
          <p className="text-sm text-gray-400" role="status" data-testid="saved-mailing-brief-loading">
            Loading saved mailing brief…
          </p>
        )}

        {isError && (
          <p className="text-sm text-red-400" role="alert" data-testid="saved-mailing-brief-error">
            Could not load the saved mailing brief. {getErrorMessage(error)}
          </p>
        )}

        {!isPending && !isError && !data && (
          <p className="text-sm text-red-400" role="alert" data-testid="saved-mailing-brief-unavailable">
            Saved mailing brief is unavailable. No brief data was returned.
          </p>
        )}

        {!isPending && !isError && data && !data.saved && (
          <p className="text-sm text-gray-400" data-testid="saved-mailing-brief-empty">
            No saved brief yet. Business context and goals will appear here when a brief is saved.
          </p>
        )}

        {!isPending && !isError && data?.saved && (
          <div className="space-y-3 text-sm" data-testid="saved-mailing-brief-content">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Business context</p>
              {context ? (
                <p className="mt-1 whitespace-pre-wrap text-gray-200" data-testid="saved-mailing-brief-context">
                  {context}
                </p>
              ) : (
                <p className="mt-1 text-gray-500" data-testid="saved-mailing-brief-context-empty">
                  No business context was saved.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Goals</p>
              {goals.length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-200" data-testid="saved-mailing-brief-goals">
                  {goals.map((goal, index) => (
                    <li key={`${goal}-${index}`}>{goal}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-gray-500" data-testid="saved-mailing-brief-goals-empty">
                  No goals were saved.
                </p>
              )}
            </div>

            {data.updatedAt && (
              <p className="text-xs text-gray-500" data-testid="saved-mailing-brief-updated">
                Updated{" "}
                <time dateTime={data.updatedAt}>{formatUpdatedAt(data.updatedAt)}</time>
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CampaignPreparationDialog
        open={prepareDialogOpen}
        onOpenChange={setPrepareDialogOpen}
        brief={data}
      />
    </Card>
  );
}
