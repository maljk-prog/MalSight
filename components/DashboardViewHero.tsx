import type { ReactNode } from "react";

type DashboardViewHeroProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
};

export default function DashboardViewHero({ eyebrow, title, description, aside }: DashboardViewHeroProps) {
  return (
    <header className="dashboard-view-hero">
      <div className="dashboard-view-hero-copy">
        <p className="dashboard-view-hero-eyebrow">{eyebrow}</p>
        <h2 className="dashboard-view-hero-title">{title}</h2>
        <div className="dashboard-view-hero-description">{description}</div>
      </div>
      {aside && <div className="dashboard-view-hero-aside">{aside}</div>}
    </header>
  );
}
