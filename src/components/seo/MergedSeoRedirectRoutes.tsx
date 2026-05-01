/**
 * Renderuje wszystkie wpisy z `useMergedRedirects` jako `<Route>` w obrębie nadrzędnego `<Routes>`.
 *
 * Musi być wywołany WEWNĄTRZ <Routes>, bo zwraca fragment <Route> elementów.
 * Korzysta z `placeholderData` w hooku, więc na pierwszym renderze (przed networkiem)
 * dostaje natychmiast hardcoded SEO_REDIRECTS — zero opóźnienia w działaniu aliasów.
 */
import { Route } from "react-router-dom";
import SeoRedirect from "@/components/seo/SeoRedirect";
import { useMergedRedirects } from "@/hooks/useMergedRedirects";

const MergedSeoRedirectRoutes = () => {
  const { data: merged = [] } = useMergedRedirects();
  return (
    <>
      {merged.map(({ from, to }) => (
        <Route key={from} path={from} element={<SeoRedirect to={to} />} />
      ))}
    </>
  );
};

export default MergedSeoRedirectRoutes;
