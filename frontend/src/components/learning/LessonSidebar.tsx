import Link from "next/link";
import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { VariantItem } from "@/lib/types";

export function LessonSidebar({
  enrollmentId,
  lessons,
  currentLessonId,
  completedIds,
  progressPercentage,
}: {
  enrollmentId: string;
  lessons: VariantItem[];
  currentLessonId: string;
  completedIds: Set<number>;
  progressPercentage: number;
}) {
  let reachedIncomplete = false;

  return (
    <aside className="flex h-full flex-col border-l">
      <div className="border-b p-4">
        <p className="mb-2 text-sm font-medium">Course Progress</p>
        <Progress value={progressPercentage} />
        <p className="mt-1 text-xs text-muted-foreground">{progressPercentage}% complete</p>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {lessons.map((lesson, index) => {
          const isCompleted = completedIds.has(lesson.id);
          const isCurrent = lesson.variant_item_id === currentLessonId;
          const isLocked = !isCompleted && reachedIncomplete && !isCurrent;
          if (!isCompleted) reachedIncomplete = true;

          const content = (
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm",
                isCurrent && "bg-primary/10 font-medium",
                isLocked && "text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : isLocked ? (
                <Lock className="h-4 w-4 shrink-0" />
              ) : isCurrent ? (
                <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <span className="line-clamp-2">
                {index + 1}. {lesson.title}
              </span>
            </div>
          );

          if (isLocked) {
            return <div key={lesson.id}>{content}</div>;
          }

          return (
            <Link key={lesson.id} href={`/learning/${enrollmentId}/${lesson.variant_item_id}`}>
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
