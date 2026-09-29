import type { ComponentType } from "react";
import { Users, Laptop, Link2, FileText, BarChart3, Crown, BookOpen, MessageSquare, GitBranch, CheckSquare, Zap } from "lucide-react";
import type { OrgMaturityCategory, EmployeeSkillCategory } from "@/lib/scoring";
import type { IconBadgeTone } from "@/components/ui/IconBadge";

type CategoryVisual = { icon: ComponentType<{ size?: number }>; tone: IconBadgeTone };

export const ORG_MATURITY_ICON: Record<OrgMaturityCategory, CategoryVisual> = {
  literacy: { icon: Users, tone: "orchid" },
  usage: { icon: Laptop, tone: "sage" },
  workflowIntegration: { icon: Link2, tone: "olive" },
  governance: { icon: FileText, tone: "coral" },
  measurement: { icon: BarChart3, tone: "orchid" },
  leadershipAdoption: { icon: Crown, tone: "sage" },
};

export const EMPLOYEE_SKILL_ICON: Record<EmployeeSkillCategory, CategoryVisual> = {
  fundamentals: { icon: BookOpen, tone: "orchid" },
  prompting: { icon: MessageSquare, tone: "sage" },
  workflowDesign: { icon: GitBranch, tone: "olive" },
  evaluation: { icon: CheckSquare, tone: "coral" },
  automation: { icon: Zap, tone: "orchid" },
};
