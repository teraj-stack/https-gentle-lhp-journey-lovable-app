import { useEffect } from "react";

const EbookPajaczki = () => {
  useEffect(() => {
    // Hide the main scrollbar since the iframe handles its own scrolling
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[45] bg-background pt-16 md:pt-20">
      <iframe
        src="/ebook-pajaczki.html"
        title="Odzyskaj beztroskę – E-book o pajączkach"
        className="w-full h-full border-0"
        loading="lazy"
      />
    </div>
  );
};

export default EbookPajaczki;
