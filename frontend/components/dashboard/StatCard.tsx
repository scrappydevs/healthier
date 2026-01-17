"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  trend?: string;
};

export function StatCard({ label, value, icon: Icon, href, trend }: StatCardProps) {
  const content = (
    <Card className={cn("group transition-colors", href && "hover:bg-muted/30 cursor-pointer")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {href && (
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          {trend && (
            <p className="mt-1 text-xs text-primary">{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
