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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Plus,
  Trash2,
  BookOpen,
  Users,
  DollarSign,
  Lock,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MembershipSite = {
  id: string;
  name: string;
  description: string;
  accessLevel: string;
  memberCount: number;
  createdAt: string;
};

type Course = {
  id: string;
  siteId: string;
  title: string;
  description: string;
  price: number;
  status: string;
  createdAt: string;
};

function AccessLevelBadge({ level }: { level: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    free: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Globe },
    paid: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: DollarSign },
    premium: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ShieldCheck },
    private: { class: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Lock },
  };
  const s = styles[level] || styles.free;
  const Icon = s.icon;
  return (
    <Badge className={s.class}>
      <Icon className="w-3 h-3 mr-1" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
}

function CreateSiteDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", accessLevel: "free" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/membership/sites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/sites"] });
      toast({ title: "Site created" });
      setOpen(false);
      setForm({ name: "", description: "", accessLevel: "free" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-site">
          <Plus className="w-4 h-4 mr-2" />
          Create Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-site">
        <DialogHeader>
          <DialogTitle>Create Membership Site</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Site Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My Learning Portal"
              data-testid="input-site-name"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe your membership site..."
              data-testid="input-site-description"
            />
          </div>
          <div>
            <Label>Access Level</Label>
            <Select value={form.accessLevel} onValueChange={(v) => set("accessLevel", v)}>
              <SelectTrigger data-testid="select-site-access">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || mutation.isPending}
            data-testid="button-submit-site"
          >
            {mutation.isPending ? "Creating..." : "Create Site"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateCourseDialog({ siteId }: { siteId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/membership/courses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/courses"] });
      toast({ title: "Course created" });
      setOpen(false);
      setForm({ title: "", description: "", price: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid={`button-add-course-${siteId}`}>
          <Plus className="w-4 h-4 mr-2" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-course">
        <DialogHeader>
          <DialogTitle>Add Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Course Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Introduction to Marketing"
              data-testid="input-course-title"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Course description..."
              data-testid="input-course-description"
            />
          </div>
          <div>
            <Label>Price ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
              data-testid="input-course-price"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                siteId,
                title: form.title,
                description: form.description || null,
                price: parseFloat(form.price) || 0,
              })
            }
            disabled={!form.title || mutation.isPending}
            data-testid="button-submit-course"
          >
            {mutation.isPending ? "Creating..." : "Add Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MembershipPage() {
  const { toast } = useToast();

  const { data: sites = [], isLoading: sitesLoading } = useQuery<MembershipSite[]>({
    queryKey: ["/api/membership/sites"],
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/membership/courses"],
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/membership/sites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/membership/courses"] });
      toast({ title: "Site deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/membership/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/courses"] });
      toast({ title: "Course deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = sitesLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="membership-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const totalRevenue = courses.reduce((sum, c) => sum + (c.price || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="membership-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Membership & Courses</h1>
            <p className="text-muted-foreground text-sm">Manage membership sites and course content</p>
          </div>
        </div>
        <CreateSiteDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-sites">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Membership Sites</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-courses">{courses.length}</p>
              <p className="text-sm text-muted-foreground">Total Courses</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-revenue">${totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Course Value</p>
            </div>
          </div>
        </Card>
      </div>

      {sites.length === 0 ? (
        <Card className="p-5">
          <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-sites">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No membership sites yet. Create your first site to get started.
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {sites.map((site) => {
            const siteCourses = courses.filter((c) => c.siteId === site.id);
            return (
              <Card key={site.id} className="p-5" data-testid={`site-${site.id}`}>
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg" data-testid={`text-site-name-${site.id}`}>{site.name}</h3>
                      <AccessLevelBadge level={site.accessLevel} />
                    </div>
                    {site.description && (
                      <p className="text-sm text-muted-foreground mt-1">{site.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {site.memberCount || 0} members
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        {siteCourses.length} courses
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreateCourseDialog siteId={site.id} />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteSiteMutation.mutate(site.id)}
                      disabled={deleteSiteMutation.isPending}
                      data-testid={`button-delete-site-${site.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {siteCourses.length > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t">
                    {siteCourses.map((course) => (
                      <div key={course.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`course-${course.id}`}>
                        <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-course-title-${course.id}`}>{course.title}</p>
                          {course.description && (
                            <p className="text-xs text-muted-foreground truncate">{course.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          ${(course.price || 0).toFixed(2)}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteCourseMutation.mutate(course.id)}
                          disabled={deleteCourseMutation.isPending}
                          data-testid={`button-delete-course-${course.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
