import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Trash2,
  Pencil,
  ArrowRightLeft,
  FileText,
  Loader2,
  Mail,
  Shield,
} from "lucide-react";
import type { TeamMember, LeadAssignment, Lead } from "@shared/schema";
import { useState } from "react";

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    member: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <Badge className={styles[role] || styles.member} data-testid={`badge-role-${role}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    invited: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    disabled: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <Badge className={styles[status] || styles.invited} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function StatsRow() {
  const { data: stats, isLoading } = useQuery<{ total: number; active: number; pending: number }>({
    queryKey: ["/api/team/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Total Members", value: stats?.total || 0, icon: Users, color: "text-primary" },
    { label: "Active Members", value: stats?.active || 0, icon: UserCheck, color: "text-emerald-400" },
    { label: "Pending Invites", value: stats?.pending || 0, icon: Clock, color: "text-yellow-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {items.map((item) => (
        <Card key={item.label} className="p-4" data-testid={`card-stat-${item.label.toLowerCase().replace(/\s/g, "-")}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value}</p>
            </div>
            <item.icon className={`w-8 h-8 ${item.color} opacity-60`} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/team/members", { email, name, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/stats"] });
      toast({ title: "Invitation sent", description: `Invited ${email} as ${role}` });
      setEmail("");
      setName("");
      setRole("member");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to invite", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-invite-member">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-invite-email"
            />
          </div>
          <div>
            <Label htmlFor="invite-name">Name (optional)</Label>
            <Input
              id="invite-name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-invite-name"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="select-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-invite"
          >
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!email || inviteMutation.isPending}
            data-testid="button-submit-invite"
          >
            {inviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({
  member,
  open,
  onOpenChange,
}: {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [role, setRole] = useState(member?.role || "member");

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/team/members/${member?.id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/stats"] });
      toast({ title: "Role updated", description: `Changed role to ${role}` });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-edit-role">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Changing role for <span className="font-medium text-foreground">{member?.name || member?.email}</span>
            </p>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="select-edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit-role">
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            data-testid="button-submit-edit-role"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersTab() {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRoleOpen, setEditRoleOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/stats"] });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    },
  });

  const openEditRole = (member: TeamMember) => {
    setEditMember(member);
    setEditRoleOpen(true);
  };

  return (
    <div>
      <StatsRow />

      {isLoading ? (
        <Card className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center" data-testid="card-no-members">
          <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No team members yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Invite your first team member to start collaborating
          </p>
          <Button onClick={() => setInviteOpen(true)} data-testid="button-invite-empty">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </Card>
      ) : (
        <Card className="overflow-visible" data-testid="card-members-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                  <TableCell className="font-medium" data-testid={`text-member-name-${member.id}`}>
                    {member.name || "—"}
                  </TableCell>
                  <TableCell data-testid={`text-member-email-${member.id}`}>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm" data-testid={`text-member-joined-${member.id}`}>
                    {member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString()
                      : member.invitedAt
                        ? `Invited ${new Date(member.invitedAt).toLocaleDateString()}`
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditRole(member)}
                        data-testid={`button-edit-role-${member.id}`}
                        title="Edit role"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(member.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-remove-member-${member.id}`}
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditRoleDialog member={editMember} open={editRoleOpen} onOpenChange={setEditRoleOpen} />
    </div>
  );
}

function AssignmentsTab() {
  const { toast } = useToast();
  const [leadId, setLeadId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<LeadAssignment[]>({
    queryKey: ["/api/team/assignments"],
  });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/team/assignments", { leadId, assignedTo, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/assignments"] });
      toast({ title: "Lead assigned", description: "Successfully assigned lead to team member" });
      setLeadId("");
      setAssignedTo("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    },
  });

  const getLeadName = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    return lead ? lead.name : id;
  };

  const getMemberName = (id: string) => {
    const member = members.find((m) => m.id === id);
    return member ? (member.name || member.email) : id;
  };

  const activeMembers = members.filter((m) => m.status === "active" || m.status === "invited");

  return (
    <div className="space-y-6">
      <Card className="p-6" data-testid="card-assign-lead">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          Assign Lead to Team Member
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Lead</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger data-testid="select-assign-lead">
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} — {lead.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Team Member</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger data-testid="select-assign-member">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Assignment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-assign-notes"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!leadId || !assignedTo || assignMutation.isPending}
            data-testid="button-assign-lead"
          >
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign Lead
          </Button>
        </div>
      </Card>

      <Card className="overflow-visible" data-testid="card-assignments-list">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Lead Assignments
          </h3>
        </div>
        {assignmentsLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center" data-testid="text-no-assignments">
            <ArrowRightLeft className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No assignments yet</h3>
            <p className="text-sm text-muted-foreground">
              Assign leads to your team members using the form above
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                  <TableCell className="font-medium" data-testid={`text-assignment-lead-${assignment.id}`}>
                    {getLeadName(assignment.leadId)}
                  </TableCell>
                  <TableCell data-testid={`text-assignment-member-${assignment.id}`}>
                    {getMemberName(assignment.assignedTo)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm" data-testid={`text-assignment-date-${assignment.id}`}>
                    {assignment.createdAt
                      ? new Date(assignment.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" data-testid={`text-assignment-notes-${assignment.id}`}>
                    {assignment.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                        disabled={deleteAssignmentMutation.isPending}
                        data-testid={`button-remove-assignment-${assignment.id}`}
                        title="Remove assignment"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <Shield className="w-7 h-7 text-primary" />
            Team Collaboration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team members and assign leads
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} data-testid="button-invite-member">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList data-testid="tabs-team">
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="w-4 h-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Lead Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersTab />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
