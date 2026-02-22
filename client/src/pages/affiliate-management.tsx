import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Trash2,
  DollarSign,
  Percent,
  TrendingUp,
  UserPlus,
  Link2,
  Search,
  Copy,
  Cookie,
  Shield,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AffiliateProgram = {
  id: string;
  userId: string;
  name: string;
  commissionRate: number;
  commissionType: string;
  cookieDays: number;
  isActive: boolean;
  createdAt: string;
};

type Affiliate = {
  id: string;
  programId: string;
  userId: string;
  name: string;
  email: string;
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  status: string;
  createdAt: string;
};

function AffiliateStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <Badge className={styles[status] || styles.pending} data-testid={`badge-affiliate-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreateProgramDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    commissionRate: "",
    commissionType: "percentage",
    cookieDays: "30",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/affiliates/programs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/programs"] });
      toast({ title: "Program created successfully" });
      setOpen(false);
      setForm({ name: "", commissionRate: "", commissionType: "percentage", cookieDays: "30" });
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commission Rate *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
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
                  <SelectItem value="fixed">Fixed ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Cookie Duration (days)</Label>
            <Input
              type="number"
              min="1"
              value={form.cookieDays}
              onChange={(e) => set("cookieDays", e.target.value)}
              placeholder="30"
              data-testid="input-cookie-days"
            />
            <p className="text-xs text-muted-foreground mt-1">How long the referral cookie tracks conversions</p>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                commissionRate: parseFloat(form.commissionRate) || 0,
                commissionType: form.commissionType,
                cookieDays: parseInt(form.cookieDays) || 30,
                isActive: true,
              })
            }
            disabled={!form.name.trim() || !form.commissionRate || mutation.isPending}
            data-testid="button-submit-program"
          >
            {mutation.isPending ? "Creating..." : "Create Program"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddAffiliateDialog({ programId }: { programId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/affiliates/members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/members"] });
      toast({ title: "Affiliate added successfully" });
      setOpen(false);
      setForm({ name: "", email: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-add-affiliate-${programId}`}>
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Add Affiliate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-affiliate">
        <DialogHeader>
          <DialogTitle>Add Affiliate Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Affiliate name"
              data-testid="input-affiliate-name"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="affiliate@example.com"
              data-testid="input-affiliate-email"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                programId,
                name: form.name,
                email: form.email,
                status: "active",
              })
            }
            disabled={!form.name.trim() || !form.email.trim() || mutation.isPending}
            data-testid="button-submit-affiliate"
          >
            {mutation.isPending ? "Adding..." : "Add Affiliate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgramCard({
  program,
  affiliates,
  onDelete,
}: {
  program: AffiliateProgram;
  affiliates: Affiliate[];
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const programAffiliates = affiliates.filter((a) => a.programId === program.id);
  const commissionLabel = program.commissionType === "fixed"
    ? `$${program.commissionRate}`
    : `${program.commissionRate}%`;

  const totalReferrals = programAffiliates.reduce((sum, a) => sum + (a.totalReferrals || 0), 0);
  const totalEarnings = programAffiliates.reduce((sum, a) => sum + (a.totalEarnings || 0), 0);

  return (
    <Card className="p-5" data-testid={`card-program-${program.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-program-name-${program.id}`}>{program.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3" />
                {commissionLabel} {program.commissionType}
              </span>
              <span className="flex items-center gap-1">
                <Cookie className="w-3 h-3" />
                {program.cookieDays}d cookie
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={program.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}>
            {program.isActive ? "Active" : "Inactive"}
          </Badge>
          <AddAffiliateDialog programId={program.id} />
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
          <p className="text-lg font-bold" data-testid={`text-affiliates-count-${program.id}`}>{programAffiliates.length}</p>
          <p className="text-xs text-muted-foreground">Affiliates</p>
        </div>
        <div className="text-center p-3 rounded-md bg-background/50">
          <p className="text-lg font-bold" data-testid={`text-referrals-${program.id}`}>{totalReferrals}</p>
          <p className="text-xs text-muted-foreground">Referrals</p>
        </div>
        <div className="text-center p-3 rounded-md bg-background/50">
          <p className="text-lg font-bold" data-testid={`text-earnings-${program.id}`}>${totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Earnings</p>
        </div>
      </div>

      {programAffiliates.length > 0 && (
        <div className="border-t pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead className="text-right">Referrals</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id} data-testid={`row-affiliate-${affiliate.id}`}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium" data-testid={`text-affiliate-name-${affiliate.id}`}>{affiliate.name}</p>
                      <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-background/50 px-2 py-0.5 rounded" data-testid={`text-referral-code-${affiliate.id}`}>
                        {affiliate.referralCode}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(affiliate.referralCode);
                          toast({ title: "Referral code copied" });
                        }}
                        data-testid={`button-copy-code-${affiliate.id}`}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-affiliate-referrals-${affiliate.id}`}>
                    {(affiliate.totalReferrals || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-affiliate-earnings-${affiliate.id}`}>
                    ${(affiliate.totalEarnings || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <AffiliateStatusBadge status={affiliate.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export default function AffiliateManagementPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("programs");
  const [search, setSearch] = useState("");

  const { data: programs, isLoading: programsLoading } = useQuery<AffiliateProgram[]>({
    queryKey: ["/api/affiliates/programs"],
  });

  const { data: affiliates = [], isLoading: affiliatesLoading } = useQuery<Affiliate[]>({
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

  const isLoading = programsLoading || affiliatesLoading;
  const allPrograms = programs || [];
  const totalReferrals = affiliates.reduce((sum, a) => sum + (a.totalReferrals || 0), 0);
  const totalPayouts = affiliates.reduce((sum, a) => sum + (a.totalEarnings || 0), 0);

  const filteredPrograms = allPrograms.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAffiliates = affiliates.filter((a) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="affiliate-management-page">
      <div className="rounded-md bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Affiliate Program Manager</h1>
              <p className="text-muted-foreground text-sm">Create programs, manage affiliates and track referral performance</p>
            </div>
          </div>
          <CreateProgramDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-programs">{allPrograms.length}</p>
              <p className="text-sm text-muted-foreground">Programs</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-teal-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-affiliates">{affiliates.length}</p>
              <p className="text-sm text-muted-foreground">Affiliates</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-referrals">{totalReferrals.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-payouts">${totalPayouts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Payouts</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="programs" data-testid="tab-programs">Programs</TabsTrigger>
            <TabsTrigger value="affiliates" data-testid="tab-affiliates">Affiliates</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder={activeTab === "programs" ? "Search programs..." : "Search affiliates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : activeTab === "programs" ? (
        filteredPrograms.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">No affiliate programs yet</h3>
              <p className="text-sm">Create your first program to start growing through affiliates.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                affiliates={affiliates}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )
      ) : (
        filteredAffiliates.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">No affiliates yet</h3>
              <p className="text-sm">Add affiliates to your programs to start tracking referrals.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id} data-testid={`row-affiliate-all-${affiliate.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${affiliate.id}`}>{affiliate.name}</TableCell>
                    <TableCell className="text-muted-foreground">{affiliate.email}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-background/50 px-2 py-0.5 rounded">{affiliate.referralCode}</code>
                    </TableCell>
                    <TableCell className="text-right">{(affiliate.totalReferrals || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">${(affiliate.totalEarnings || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <AffiliateStatusBadge status={affiliate.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}
    </div>
  );
}
