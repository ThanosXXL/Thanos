const skillGroups: { title: string; items: string[] }[] = [
  { title: "Programmiersprache", items: ["PHP"] },
  {
    title: "Expertise",
    items: ["Algorithmen & Datenstrukturen", "Performance", "Sicherheit", "Design", "Datenbanken"],
  },
  {
    title: "Frontend-Framework",
    items: ["React.js", "Bootstrap", "Tailwind CSS", "Next.js", "Angular"],
  },
  {
    title: "Backend-Framework",
    items: ["Django", "Laravel", "Express.js", "Node.js", "Next.js"],
  },
  {
    title: "KI & Low-/No-Code-Builder",
    items: [
      "Replit",
      "Bubble",
      "Adalo",
      "Mendix",
      "Webflow",
      "Glide",
      "Thunkable",
      "Wappler",
      "Softr",
      "Betty Blocks",
      "UI Bakery",
    ],
  },
];

export default function Skills() {
  return (
    <section id="skills" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Unser <span className="text-gold-gradient">Tech-Stack</span>
        </h2>

        <div className="mt-10 space-y-8">
          {skillGroups.map((group) => (
            <div key={group.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300/70">
                {group.title}
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-gold-500/25 bg-white/[0.03] px-4 py-1.5 text-sm text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/60 hover:text-gold-200 hover:shadow-glossy"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
