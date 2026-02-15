import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
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
  ArrowLeft,
  ChevronRight,
  CircleCheck,
  Circle,
} from "lucide-react";
import trainingRobotImg from "@assets/image_1770823658874.png";

interface Lesson {
  titleKey: string;
  contentKey: string;
}

interface CourseDef {
  titleKey: string;
  descKey: string;
  duration: string;
  lessons: number;
  status: string;
  icon: any;
  color: string;
  lessonDefs: Lesson[];
}

const courseDefs: CourseDef[] = [
  {
    titleKey: "training.course1Title",
    descKey: "training.course1Desc",
    duration: "15 min",
    lessons: 5,
    status: "available",
    icon: BookOpen,
    color: "bg-primary/10 text-primary",
    lessonDefs: [
      { titleKey: "training.c1l1Title", contentKey: "training.c1l1Content" },
      { titleKey: "training.c1l2Title", contentKey: "training.c1l2Content" },
      { titleKey: "training.c1l3Title", contentKey: "training.c1l3Content" },
      { titleKey: "training.c1l4Title", contentKey: "training.c1l4Content" },
      { titleKey: "training.c1l5Title", contentKey: "training.c1l5Content" },
    ],
  },
  {
    titleKey: "training.course2Title",
    descKey: "training.course2Desc",
    duration: "30 min",
    lessons: 8,
    status: "available",
    icon: Users,
    color: "bg-chart-2/10 text-chart-2",
    lessonDefs: [
      { titleKey: "training.c2l1Title", contentKey: "training.c2l1Content" },
      { titleKey: "training.c2l2Title", contentKey: "training.c2l2Content" },
      { titleKey: "training.c2l3Title", contentKey: "training.c2l3Content" },
      { titleKey: "training.c2l4Title", contentKey: "training.c2l4Content" },
      { titleKey: "training.c2l5Title", contentKey: "training.c2l5Content" },
      { titleKey: "training.c2l6Title", contentKey: "training.c2l6Content" },
      { titleKey: "training.c2l7Title", contentKey: "training.c2l7Content" },
      { titleKey: "training.c2l8Title", contentKey: "training.c2l8Content" },
    ],
  },
  {
    titleKey: "training.course3Title",
    descKey: "training.course3Desc",
    duration: "25 min",
    lessons: 6,
    status: "available",
    icon: Mail,
    color: "bg-chart-3/10 text-chart-3",
    lessonDefs: [
      { titleKey: "training.c3l1Title", contentKey: "training.c3l1Content" },
      { titleKey: "training.c3l2Title", contentKey: "training.c3l2Content" },
      { titleKey: "training.c3l3Title", contentKey: "training.c3l3Content" },
      { titleKey: "training.c3l4Title", contentKey: "training.c3l4Content" },
      { titleKey: "training.c3l5Title", contentKey: "training.c3l5Content" },
      { titleKey: "training.c3l6Title", contentKey: "training.c3l6Content" },
    ],
  },
  {
    titleKey: "training.course4Title",
    descKey: "training.course4Desc",
    duration: "35 min",
    lessons: 10,
    status: "available",
    icon: Bot,
    color: "bg-chart-4/10 text-chart-4",
    lessonDefs: [
      { titleKey: "training.c4l1Title", contentKey: "training.c4l1Content" },
      { titleKey: "training.c4l2Title", contentKey: "training.c4l2Content" },
      { titleKey: "training.c4l3Title", contentKey: "training.c4l3Content" },
      { titleKey: "training.c4l4Title", contentKey: "training.c4l4Content" },
      { titleKey: "training.c4l5Title", contentKey: "training.c4l5Content" },
      { titleKey: "training.c4l6Title", contentKey: "training.c4l6Content" },
      { titleKey: "training.c4l7Title", contentKey: "training.c4l7Content" },
      { titleKey: "training.c4l8Title", contentKey: "training.c4l8Content" },
      { titleKey: "training.c4l9Title", contentKey: "training.c4l9Content" },
      { titleKey: "training.c4l10Title", contentKey: "training.c4l10Content" },
    ],
  },
  {
    titleKey: "training.course5Title",
    descKey: "training.course5Desc",
    duration: "20 min",
    lessons: 5,
    status: "available",
    icon: Target,
    color: "bg-amber-500/10 text-amber-400",
    lessonDefs: [
      { titleKey: "training.c5l1Title", contentKey: "training.c5l1Content" },
      { titleKey: "training.c5l2Title", contentKey: "training.c5l2Content" },
      { titleKey: "training.c5l3Title", contentKey: "training.c5l3Content" },
      { titleKey: "training.c5l4Title", contentKey: "training.c5l4Content" },
      { titleKey: "training.c5l5Title", contentKey: "training.c5l5Content" },
    ],
  },
  {
    titleKey: "training.course6Title",
    descKey: "training.course6Desc",
    duration: "25 min",
    lessons: 7,
    status: "available",
    icon: BarChart3,
    color: "bg-emerald-500/10 text-emerald-400",
    lessonDefs: [
      { titleKey: "training.c6l1Title", contentKey: "training.c6l1Content" },
      { titleKey: "training.c6l2Title", contentKey: "training.c6l2Content" },
      { titleKey: "training.c6l3Title", contentKey: "training.c6l3Content" },
      { titleKey: "training.c6l4Title", contentKey: "training.c6l4Content" },
      { titleKey: "training.c6l5Title", contentKey: "training.c6l5Content" },
      { titleKey: "training.c6l6Title", contentKey: "training.c6l6Content" },
      { titleKey: "training.c6l7Title", contentKey: "training.c6l7Content" },
    ],
  },
];

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "completed") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        {t("training.completed")}
      </Badge>
    );
  }
  if (status === "in-progress") {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20">
        <Play className="w-3 h-3 mr-1" />
        {t("training.inProgress")}
      </Badge>
    );
  }
  if (status === "locked") {
    return (
      <Badge className="bg-secondary text-muted-foreground border-border">
        <Lock className="w-3 h-3 mr-1" />
        {t("training.locked")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
      {t("training.available")}
    </Badge>
  );
}

function CourseViewer({
  course,
  courseIndex,
  completedLessons,
  onComplete,
  onBack,
}: {
  course: CourseDef;
  courseIndex: number;
  completedLessons: Set<string>;
  onComplete: (lessonKey: string) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [activeLesson, setActiveLesson] = useState(0);
  const Icon = course.icon;
  const lesson = course.lessonDefs[activeLesson];
  const lessonKey = `${courseIndex}-${activeLesson}`;
  const isLessonComplete = completedLessons.has(lessonKey);
  const completedInCourse = course.lessonDefs.filter((_, i) =>
    completedLessons.has(`${courseIndex}-${i}`)
  ).length;

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-courses">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("common.back")}
        </Button>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${course.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="font-semibold" data-testid="text-course-title">{t(course.titleKey)}</h2>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 ml-auto">
          {completedInCourse}/{course.lessonDefs.length} {t("training.completed").toLowerCase()}
        </Badge>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">{t("training.lessonsCount", { count: course.lessonDefs.length })}</p>
          <div className="space-y-0.5">
            {course.lessonDefs.map((l, i) => {
              const lKey = `${courseIndex}-${i}`;
              const done = completedLessons.has(lKey);
              const active = i === activeLesson;
              return (
                <button
                  key={i}
                  onClick={() => setActiveLesson(i)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors ${
                    active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid={`button-lesson-${i}`}
                >
                  {done ? (
                    <CircleCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{t(l.titleKey)}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-lg font-semibold" data-testid="text-lesson-title">{t(lesson.titleKey)}</h3>
            {isLessonComplete ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t("training.completed")}
              </Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-6" data-testid="text-lesson-content">
            {t(lesson.contentKey)}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {!isLessonComplete && (
              <Button onClick={() => onComplete(lessonKey)} data-testid="button-mark-complete">
                <CheckCircle className="w-4 h-4 mr-2" />
                {t("training.markComplete")}
              </Button>
            )}
            {activeLesson < course.lessonDefs.length - 1 && (
              <Button
                variant="outline"
                onClick={() => setActiveLesson(activeLesson + 1)}
                className="ml-auto"
                data-testid="button-next-lesson"
              >
                {t("training.nextLesson")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const { t } = useTranslation();
  usePageTitle(t("training.title"));
  const [activeCourse, setActiveCourse] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("training-completed");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const handleComplete = (lessonKey: string) => {
    const next = new Set(completedLessons);
    next.add(lessonKey);
    setCompletedLessons(next);
    localStorage.setItem("training-completed", JSON.stringify(Array.from(next)));
  };

  const getCourseStatus = (courseIndex: number) => {
    const course = courseDefs[courseIndex];
    const total = course.lessonDefs.length;
    const done = course.lessonDefs.filter((_, i) =>
      completedLessons.has(`${courseIndex}-${i}`)
    ).length;
    if (done === total) return "completed";
    if (done > 0) return "in-progress";
    return "available";
  };

  if (activeCourse !== null) {
    return (
      <CourseViewer
        course={courseDefs[activeCourse]}
        courseIndex={activeCourse}
        completedLessons={completedLessons}
        onComplete={handleComplete}
        onBack={() => setActiveCourse(null)}
      />
    );
  }

  const completedCount = courseDefs.filter((_, i) => getCourseStatus(i) === "completed").length;
  const totalCount = courseDefs.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-training-title">{t("training.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("training.subtitle")}
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
          {t("training.completedCount", { completed: completedCount, total: totalCount })}
        </Badge>
      </div>

      <Card className="relative overflow-hidden">
        <img src={trainingRobotImg} alt={t("training.title")} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">{t("training.masterPlatform")}</p>
            <p className="text-sm text-muted-foreground max-w-sm">{t("training.masterPlatformDesc")}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">{t("training.yourProgress")}</p>
              <p className="text-sm text-muted-foreground">{t("training.percentComplete", { percent: progressPercent })}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("training.coursesCompleted", { completed: completedCount, total: totalCount })}</p>
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
        {courseDefs.map((course, i) => {
          const status = getCourseStatus(i);
          return (
            <Card
              key={i}
              className="p-5"
              data-testid={`training-course-${i}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${course.color}`}>
                  <course.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm">{t(course.titleKey)}</h3>
                    <StatusBadge status={status} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{t(course.descKey)}</p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {t("training.lessonsCount", { count: course.lessons })}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={status === "completed" ? "outline" : "default"}
                      onClick={() => setActiveCourse(i)}
                      data-testid={`button-course-${i}`}
                    >
                      {status === "completed" ? t("training.review") : status === "in-progress" ? t("training.continue") : t("training.start")}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
