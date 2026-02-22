import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Trash2,
  DollarSign,
  Percent,
  TrendingUp,
  UserPlus,
  Link2,
  BarChart3,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AffiliateProgram = {
  id: string;
  name: string;
  description: string;
  commissionRate: number;
  commissionType: string;
  status: string;
  totalMembers: number;
  totalRevenue: number;
  totalPayouts: number;
  createdAt: string;
};

type AffiliateMember = {
  id: string;
  programId: string;
  name: string;
  email: string;
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  status: string;
  joinedAt: string;
};

function CreateProgramDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    commissionRate: "",
    commissionType: "percentage",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/affiliates/programs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/programs"] });
      toast({ title: "Program created successfully" });
      setOpen(false);
      setForm({ name: "", description: "", commissionRate: "", commissionType: "percentage" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-program">
          <Plus className="w-4 h-4 mr-2" />
          Create Program
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-program">
        <DialogHeader>
          <DialogTitle>Create Affiliate Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Program Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Partner Program"
              data-testid="input-program-name"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Earn commissions by referring new customers..."
              data-testid="input-program-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commission Rate *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.commissionRate}
                onChange={(e) => set("commissionRate", e.target.value)}
                placeholder="20"
                data-testid="input-commission-rate"
              />
            </div>
            <div>
              <Label>Commission Type</Label>
              <Select value={form.commissionType} onValueChange={(v) => set("commissionType", v)}>
                <SelectTrigger data-testid="select-commission-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Rate ($)</SelectItem>
                  <SelectItem value="recurring">Recurring (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                description: form.description || null,
                commissionRate: parseFloat(form.commissionRate) || 0,
                commissionType: form.commissionType,
                status: "active",
              })
            }
            disabled={!form.name || !form.commissionRate || mutation.isPending}
            data-testid="button-submit-program"
          >
            {mutation.isPending ? "Creating..." : "Create Program"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgramCard({
  program,
  members,
  onDelete,
}: {
  program: AffiliateProgram;
  members: AffiliateMember[];
  onDelete: (id: string) => void;
}) {
  const programMembers = members.filter((m) => m.programId === program.id);
  const commissionLabel = program.commissionType === "flat"
    ? `$${program.commissionRate}`
    : `${program.commissionRate}%`;

  return (
    <Card className="p-5" data-testid={`card-program-${program.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-program-name-${program.id}`}>{program.name}</h3>
            {program.description && (
              <p className="text-xs text-muted-foreground truncate">{program.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            {commissionLabel} {program.commissionType}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(program.id)}
            data-testid={`button-delete-program-${program.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-md bg-background/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold" data-testid={`text-members-${program.id}`}>{program.totalMembers}</p>
          <p className="text-xs text-muted-foreground">Members</p>
        </div>
        <div className="text-center p-3 rounded-md bg-background/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold" data-testid={`text-revenue-${program.id}`}>${program.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </div>
        <div className="text-center p-3 rounded-md bg-background/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold" data-testid={`text-payouts-${program.id}`}>${program.totalPayouts.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Payouts</p>
        </div>
      </div>

      {programMembers.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2">Top Affiliates</h4>
          <div className="space-y-2">
            {programMembers.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 p-2 rounded-md bg-background/50 flex-wrap"
                data-testid={`member-${member.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>{member.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {member.referralCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{member.totalReferrals} referrals</p>
                  <p className="text-xs text-emerald-400">${member.totalEarnings.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AffiliateManagementPage() {
  const { toast } = useToast();

  const { data: programs, isLoading: programsLoading } = useQuery<AffiliateProgram[]>({
    queryKey: ["/api/affiliates/programs"],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<AffiliateMember[]>({
    queryKey: ["/api/affiliates/members"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/affiliates/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/members"] });
      toast({ title: "Program deleted" });
    },
  });

  const isLoading = programsLoading || membersLoading;
  const totalRevenue = (programs || []).reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalMembers = (programs || []).reduce((sum, p) => sum + p.totalMembers, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="affiliate-management-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Affiliate Management</h1>
            <p className="text-muted-foreground text-sm">Manage affiliate programs and track performance</p>
          </div>
        </div>
        <CreateProgramDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-programs">{(programs || []).length}</p>
              <p className="text-sm text-muted-foreground">Programs</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-members">{totalMembers}</p>
              <p className="text-sm text-muted-foreground">Total Affiliates</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-revenue">${totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (programs || []).length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No affiliate programs yet</h3>
            <p className="text-sm">Create your first program to start growing through affiliates.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(programs || []).map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              members={members}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
