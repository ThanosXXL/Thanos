import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import WhyUs from "@/components/WhyUs";
import Pricing from "@/components/Pricing";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Services />
      <WhyUs />
      <Pricing />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}
