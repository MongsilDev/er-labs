import SiteHeader from "@/components/SiteHeader";
import ThemeToggle from "./ThemeToggle";

export default function Header({ crumb, wide }: { crumb?: { href: string; label: string }; wide?: boolean }) {
  return (
    <SiteHeader crumb={crumb} wide={wide}>
      <ThemeToggle />
    </SiteHeader>
  );
}
