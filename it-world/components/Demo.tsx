const FILE_SIZE_MB = "2,8";

export default function Demo() {
  return (
    <section id="demo" className="px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-gold-gradient">Demo-Video</span> ansehen
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/65">
          Ein kurzer Rundgang durch IT-World – Design, Pakete und Tech-Stack in 30 Sekunden.
        </p>

        <div className="mt-10 overflow-hidden rounded-2xl glass-panel shadow-card">
          <video
            controls
            preload="metadata"
            poster="/demo/it-world-demo-poster.jpg"
            className="block w-full"
          >
            <source src="/demo/it-world-demo.mp4" type="video/mp4" />
          </video>
        </div>

        <a
          href="/demo/it-world-demo.mp4"
          download="IT-World-Demo.mp4"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3.5 text-sm font-bold text-ink-950 shadow-glossy transition-transform hover:scale-105"
        >
          Demo-Video herunterladen ({FILE_SIZE_MB} MB)
          <span aria-hidden>↓</span>
        </a>
      </div>
    </section>
  );
}
