import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ui-field flex field-sizing-content min-h-16 w-full px-3.5 py-2.5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
