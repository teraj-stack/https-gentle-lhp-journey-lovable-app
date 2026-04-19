import { useLocation } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs";
import { resolveBreadcrumbs } from "@/lib/breadcrumbsMap";

/**
 * Renderuje breadcrumbs automatycznie na podstawie aktualnej ścieżki.
 * Pomija strony bez mapowania (home, dynamiczne, admin) — te strony
 * mogą renderować własny <Breadcrumbs/> (np. BlogPost z dynamicznym tytułem).
 *
 * Wstawione w <Layout/> tuż po <Header/>.
 */
const AutoBreadcrumbs = () => {
  const { pathname } = useLocation();
  const items = resolveBreadcrumbs(pathname);
  if (!items) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-2">
      <Breadcrumbs items={items} />
    </div>
  );
};

export default AutoBreadcrumbs;
