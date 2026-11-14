import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tone } from "@/components/shared/icon-chip";
import { IconHeading } from "@/components/shared/cards";

interface AuthCardProps {
  icon: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Line under the form, e.g. "Already have an account? Login". */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Login/register card: extends Card with an IconHeading header and a footer line. */
export function AuthCard({ icon, tone = "emerald", title, description, footer, children }: AuthCardProps) {
  return (
    <Card className="ui-auth-card">
      <CardHeader className="ui-card-heading">
        <IconHeading
          icon={icon}
          tone={tone}
          title={<CardTitle className="text-2xl">{title}</CardTitle>}
          description={description && <CardDescription>{description}</CardDescription>}
        />
      </CardHeader>
      <CardContent>
        {children}
        {footer && <p className="ui-auth-footer">{footer}</p>}
      </CardContent>
    </Card>
  );
}
