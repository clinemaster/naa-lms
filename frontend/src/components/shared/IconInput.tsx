"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<typeof Input>;

/** Text field with a leading icon, in the standard field size and style. */
export function IconInput({ icon: Icon, ...props }: InputProps & { icon: LucideIcon }) {
  return (
    <div className="ui-field-wrap">
      <Icon className="ui-field-icon" />
      <Input {...props} />
    </div>
  );
}

/** Password field with a key icon and a show/hide toggle. */
export function PasswordInput({ className, ...props }: Omit<InputProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="ui-field-wrap">
      <KeyRound className="ui-field-icon" />
      <Input type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="ui-field-action"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
