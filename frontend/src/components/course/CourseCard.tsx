import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl } from "@/lib/utils";
import type { Course } from "@/lib/types";

export function CourseCard({ course }: { course: Course }) {
  const image = mediaUrl(course.image);

  return (
    <Card className="flex h-full flex-col overflow-hidden pt-0 transition-shadow hover:shadow-md">
      <div className="relative aspect-video w-full bg-muted">
        {image ? (
          <Image src={image} alt={course.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <div className="mt-auto flex flex-col gap-1 pt-2 text-xs text-muted-foreground">
          {course.teacher_name && <span>Teacher: {course.teacher_name}</span>}
          <span>{course.total_lessons} Lessons</span>
          {course.level && (
            <Badge className="w-fit" variant="secondary">
              {course.level}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" render={<Link href={`/courses/${course.slug}`}>View Course</Link>} />
      </CardFooter>
    </Card>
  );
}
