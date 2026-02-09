import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Play,
  Clock,
  CheckCircle,
  Lock,
  BookOpen,
  TrendingUp,
  Users,
  Bot,
  Mail,
  Target,
  BarChart3,
} from "lucide-react";

const courses = [
  {
    title: "Getting Started with ArgiFlow",
    description: "Learn the basics of setting up your account and configuring your first AI agents.",
    duration: "15 min",
    lessons: 5,
    status: "completed",
    icon: BookOpen,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Lead Generation Mastery",
    description: "Master advanced lead generation techniques using AI-powered prospecting tools.",
    duration: "30 min",
    lessons: 8,
    status: "in-progress",
    icon: Users,
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    title: "Email & SMS Campaigns",
    description: "Create high-converting email and SMS campaigns with AI-generated copy.",
    duration: "25 min",
    lessons: 6,
    status: "available",
    icon: Mail,
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    title: "AI Agent Configuration",
    description: "Deep dive into configuring and optimizing your AI agents for maximum performance.",
    duration: "35 min",
    lessons: 10,
    status: "available",
    icon: Bot,
    color: "bg-chart-4/10 text-chart-4",
  },
  {
    title: "Lead Scoring & Qualification",
    description: "Set up intelligent lead scoring models to prioritize your hottest prospects.",
    duration: "20 min",
    lessons: 5,
    status: "locked",
    icon: Target,
    color: "bg-amber-500/10 text-amber-400",
  },
  {
    title: "Analytics & Reporting",
    description: "Understand your metrics and create custom reports for data-driven decisions.",
    duration: "25 min",
    lessons: 7,
    status: "locked",
    icon: BarChart3,
    color: "bg-emerald-500/10 text-emerald-400",
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  }
  if (status === "in-progress") {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20">
        <Play className="w-3 h-3 mr-1" />
        In Progress
      </Badge>
    );
  }
  if (status === "locked") {
    return (
      <Badge className="bg-secondary text-muted-foreground border-border">
        <Lock className="w-3 h-3 mr-1" />
        Locked
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
      Available
    </Badge>
  );
}

export default function TrainingPage() {
  const completedCount = courses.filter((c) => c.status === "completed").length;
  const totalCount = courses.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-training-title">Training Center</h1>
          <p className="text-muted-foreground text-sm">
            Level up your skills and get the most out of ArgiFlow.
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
          {completedCount}/{totalCount} Completed
        </Badge>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Your Progress</p>
              <p className="text-sm text-muted-foreground">{progressPercent}% complete</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{completedCount} of {totalCount} courses completed</p>
        </div>
        <div className="w-full bg-secondary/50 rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
            data-testid="progress-bar"
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course, i) => (
          <Card
            key={i}
            className={`p-5 ${course.status === "locked" ? "opacity-60" : ""}`}
            data-testid={`training-course-${i}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${course.color}`}>
                <course.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-sm">{course.title}</h3>
                  <StatusBadge status={course.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-3">{course.description}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {course.lessons} lessons
                    </span>
                  </div>
                  {course.status !== "locked" && (
                    <Button
                      size="sm"
                      variant={course.status === "completed" ? "outline" : "default"}
                      data-testid={`button-course-${i}`}
                    >
                      {course.status === "completed" ? "Review" : course.status === "in-progress" ? "Continue" : "Start"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
