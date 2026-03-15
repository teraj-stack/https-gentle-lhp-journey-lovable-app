import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const CTASection = () => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto"
  >
    <div className="text-4xl mb-4">🔒</div>
    <h2 className="text-2xl font-bold text-foreground mb-3">Masz intymne pytania?</h2>
    <p className="text-muted-foreground leading-relaxed mb-6">
      Napisz do nas dyskretną wiadomość. Nie oceniamy, delikatnie badamy i w pełni rozumiemy Twój problem. Jesteśmy tu, by pomóc, a nie oceniać.
    </p>
    <Button variant="hero" size="lg" className="mb-4 px-10 py-6">
      Wyślij dyskretną wiadomość
    </Button>
    <p className="text-muted-foreground text-sm">📱 Zapisz ten ekran w galerii telefonu</p>
  </motion.section>
);

export default CTASection;
