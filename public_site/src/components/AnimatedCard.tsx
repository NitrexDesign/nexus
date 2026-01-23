import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface AnimatedCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function AnimatedCard({
  title,
  description,
  icon: Icon,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all group"
    >
      <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
