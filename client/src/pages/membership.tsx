import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Power,
  PowerOff,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MembershipSite = {
  id: string;
  userId: string;
  name: string;
  description: string;
  accessLevel: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
};

type Course = {
  id: string;
  siteId: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  status: string;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
};

function AccessLevelBadge({ level }: { level: string }) {
  const styles: Record<string, { class: string; icon: typeof Globe }> = {
    free: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Globe },
    paid: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: DollarSign },
    premium: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ShieldCheck },
    private: { class: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Lock },
  };
  const s = styles[level] || styles.free;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-access-${level}`}>
      <Icon className="w-3 h-3 mr-1" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
}

function CourseStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: typeof FileText }> = {
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileText },
    published: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-course-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreateSiteDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", accessLevel: "free" });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/membership/sites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/sites"] });
      toast({ title: "Site created successfully" });
      setOpen(false);
      setForm({ name: "", description: "", accessLevel: "free" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create site", description: err.message, variant: "destructive" });
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
            <GraduationCap className="w-4 h-4 mr-2" />
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
  const [form, setForm] = useState({ title: "", description: "", price: "", duration: "", status: "draft" });

  const mutation = useMutation({
    mutationFn: (data: {
      siteId: string;
      title: string;
      description: string | null;
      price: number;
      duration: string;
      status: string;
    }) => apiRequest("POST", "/api/membership/courses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/courses"] });
      toast({ title: "Course created" });
      setOpen(false);
      setForm({ title: "", description: "", price: "", duration: "", status: "draft" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create course", description: err.message, variant: "destructive" });
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
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label>Duration</Label>
              <Input
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="4 weeks"
                data-testid="input-course-duration"
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="select-course-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                siteId,
                title: form.title,
                description: form.description || null,
                price: parseFloat(form.price) || 0,
                duration: form.duration,
                status: form.status,
              })
            }
            disabled={!form.title || mutation.isPending}
            data-testid="button-submit-course"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Creating..." : "Add Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SiteCard({
  site,
  courses,
  onDeleteSite,
  onDeleteCourse,
  onPublishCourse,
  isDeleting,
  isDeletingCourse,
}: {
  site: MembershipSite;
  courses: Course[];
  onDeleteSite: (id: string) => void;
  onDeleteCourse: (id: string) => void;
  onPublishCourse: (id: string) => void;
  isDeleting: boolean;
  isDeletingCourse: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const siteCourses = courses.filter((c) => c.siteId === site.id);

  return (
    <Card className="p-5" data-testid={`site-${site.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-lg" data-testid={`text-site-name-${site.id}`}>
              {site.name}
            </h3>
            <AccessLevelBadge level={site.accessLevel} />
            {site.isActive ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <Power className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                <PowerOff className="w-3 h-3 mr-1" />
                Inactive
              </Badge>
            )}
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
            <span className="text-xs text-muted-foreground">
              Created: {new Date(site.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreateCourseDialog siteId={site.id} />
          {siteCourses.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-courses-${site.id}`}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeleteSite(site.id)}
            disabled={isDeleting}
            data-testid={`button-delete-site-${site.id}`}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {expanded && siteCourses.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t">
          {siteCourses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-4 p-3 rounded-md bg-background/50"
              data-testid={`course-${course.id}`}
            >
              <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate" data-testid={`text-course-title-${course.id}`}>
                    {course.title}
                  </p>
                  <CourseStatusBadge status={course.status} />
                </div>
                {course.description && (
                  <p className="text-xs text-muted-foreground truncate">{course.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3 inline" />
                    {(course.price || 0).toFixed(2)}
                  </span>
                  {course.duration && (
                    <span className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {course.duration}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    <Users className="w-3 h-3 inline mr-0.5" />
                    {course.enrollmentCount || 0} enrolled
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {course.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPublishCourse(course.id)}
                    data-testid={`button-publish-course-${course.id}`}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Publish
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeleteCourse(course.id)}
                  disabled={isDeletingCourse}
                  data-testid={`button-delete-course-${course.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function MembershipPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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

  const publishCourseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/membership/courses/${id}`, { status: "published" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership/courses"] });
      toast({ title: "Course published" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = sitesLoading || coursesLoading;

  const totalMembers = sites.reduce((sum, s) => sum + (s.memberCount || 0), 0);
  const totalRevenue = courses.reduce((sum, c) => sum + (c.price || 0) * (c.enrollmentCount || 0), 0);

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      !searchQuery ||
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab =
      activeTab === "all" ||
      site.accessLevel === activeTab;
    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="membership-loading">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="membership-page">
      <div className="rounded-md bg-gradient-to-r from-purple-600/20 via-blue-500/10 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Membership & Courses
              </h1>
              <p className="text-muted-foreground text-sm">
                Build membership sites, create courses, and manage enrollments
              </p>
            </div>
          </div>
          <CreateSiteDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-sites">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Sites</p>
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
              <p className="text-sm text-muted-foreground">Courses</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-members">{totalMembers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-revenue">
                ${totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-membership-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="free" data-testid="tab-free">Free</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">Paid</TabsTrigger>
            <TabsTrigger value="premium" data-testid="tab-premium">Premium</TabsTrigger>
            <TabsTrigger value="private" data-testid="tab-private">Private</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-sites"
          />
        </div>
      </div>

      {filteredSites.length === 0 ? (
        <Card className="p-5">
          <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-sites">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No membership sites found</p>
            <p className="text-xs mt-1">Create your first membership site to start building courses.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              courses={courses}
              onDeleteSite={(id) => deleteSiteMutation.mutate(id)}
              onDeleteCourse={(id) => deleteCourseMutation.mutate(id)}
              onPublishCourse={(id) => publishCourseMutation.mutate(id)}
              isDeleting={deleteSiteMutation.isPending}
              isDeletingCourse={deleteCourseMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
