import { motion } from "framer-motion";

interface Props {
  fadeUp: Record<string, unknown>;
}

const EVLTValves = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Mechanizm powstawania: Zastawki</h2>
    <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
      Wyobraź sobie, że w Twoich żyłach znajdują się małe, jednokierunkowe zawory. Przepuszczają krew do serca, walcząc z grawitacją. Gdy słabną, krew cofa się, tworząc wypukłe zmiany.
    </p>
    {/* Film */}
    <div className="max-w-2xl mx-auto mb-10">
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src="https://www.youtube.com/embed/9Wf8bLXVwFI?clip=Ugkx7Zf-uAOCFSL1NYwqZjQ5KqzVM5Fyqg6B&clipt=EAAYyJkC&mute=1&autoplay=1&loop=1&playlist=9Wf8bLXVwFI"
          title="Mechanizm powstawania żylaków"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>

    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
      {/* Zdrowa żyła */}
      <div className="text-center">
        <div className="relative w-20 h-48 mx-auto border-l-[6px] border-r-[6px] border-primary/60 rounded bg-primary/5 mb-4">
          <div className="absolute top-1/3 left-0 w-[45%] h-1 bg-primary/60 origin-left rotate-[-20deg]" />
          <div className="absolute top-1/3 right-0 w-[45%] h-1 bg-primary/60 origin-right rotate-[20deg]" />
          <div className="absolute top-2/3 left-0 w-[45%] h-1 bg-primary/60 origin-left rotate-[-20deg]" />
          <div className="absolute top-2/3 right-0 w-[45%] h-1 bg-primary/60 origin-right rotate-[20deg]" />
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-primary text-lg font-bold">↑</span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-primary text-lg font-bold">↑</span>
        </div>
        <h4 className="font-bold text-foreground text-sm">Zdrowa żyła</h4>
        <p className="text-xs text-muted-foreground max-w-[180px] mx-auto mt-1">
          Zastawki szczelnie się zamykają. Krew płynie sprawnie w kierunku serca.
        </p>
      </div>

      <span className="text-3xl text-muted-foreground hidden md:block">➞</span>
      <span className="text-3xl text-muted-foreground md:hidden rotate-90">➞</span>

      {/* Chora żyła */}
      <div className="text-center">
        <div className="relative w-24 h-48 mx-auto border-l-[6px] border-r-[6px] border-destructive/60 rounded-xl bg-destructive/5 mb-4">
          <div className="absolute top-1/3 left-0 w-[35%] h-1 bg-destructive/60 origin-left rotate-[30deg]" />
          <div className="absolute top-1/3 right-0 w-[35%] h-1 bg-destructive/60 origin-right rotate-[-30deg]" />
          <div className="absolute top-2/3 left-0 w-[35%] h-1 bg-destructive/60 origin-left rotate-[30deg]" />
          <div className="absolute top-2/3 right-0 w-[35%] h-1 bg-destructive/60 origin-right rotate-[-30deg]" />
          <span className="absolute top-2 left-1/3 -translate-x-1/2 text-destructive text-lg font-bold">↓</span>
          <span className="absolute top-2 right-1/3 translate-x-1/2 text-primary text-lg font-bold">↑</span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-destructive text-lg font-bold">↓</span>
          <div className="absolute top-1/2 -left-4 w-4 h-10 rounded-l-full bg-destructive/10 border-l-[3px] border-destructive/40" />
        </div>
        <h4 className="font-bold text-foreground text-sm">Chora żyła (Żylak)</h4>
        <p className="text-xs text-muted-foreground max-w-[180px] mx-auto mt-1">
          Zastawki są niewydolne. Krew opada w dół, rozpychając ściany naczyń.
        </p>
      </div>
    </div>
  </motion.section>
);

export default EVLTValves;
