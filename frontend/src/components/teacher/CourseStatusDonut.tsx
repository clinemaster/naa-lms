"use client";

import { Donut, type DonutSegment } from "@/components/shared/Donut";

export function CourseStatusDonut({ segments, total }: { segments: DonutSegment[]; total: number }) {
  return (
    <div className="flex items-center justify-center">
      <Donut segments={segments} total={total} centerValue={total} centerLabel="My Courses" />
    </div>
  );
}
