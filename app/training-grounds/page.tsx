import type { Metadata } from "next";
import Link from "next/link";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import TrainingGrounds from "../../components/TrainingGrounds";

export const metadata: Metadata = {
  title: "Training Grounds | MalSight",
  description:
    "MalSight's dedicated security knowledge and intrusion-analysis training environment.",
};

export default function TrainingGroundsPage() {
  return (
    <main className="cyber-background training-product min-h-screen px-3 py-6 text-[#243B32] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <header className="training-product-header">
          <div>
            <Link className="training-product-back" href="/">
              <span aria-hidden="true">←</span> MalSight Dashboard
            </Link>
            <p className="training-product-kicker">MALSIGHT PRODUCT</p>
            <h1>Training Grounds</h1>
            <p>Practice. Investigate. Build defender instincts.</p>
          </div>
          <ThemeSwitcher />
        </header>

        <section className="theme-dashboard training-product-shell overflow-hidden rounded-3xl border border-[#8DA99B]/60 bg-[#E6E4DE]/88 text-[#243B32] shadow-2xl shadow-[#13231D]/35 backdrop-blur">
          <div className="training-product-bar">
            <div>
              <p>TRAINING ENVIRONMENT</p>
              <span>Knowledge checks and hands-on intrusion analysis</span>
            </div>
            <span className="training-product-status">
              <i aria-hidden="true" /> Ready for session
            </span>
          </div>
          <div className="theme-dashboard-content p-3 sm:p-6">
            <TrainingGrounds />
          </div>
        </section>
      </div>
    </main>
  );
}
