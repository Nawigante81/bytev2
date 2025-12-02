import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { HardDrive, MemoryStick, Cpu, Power, Keyboard, Cable } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import ProductsList from '@/components/ProductsList';
import HeroGallery from '@/components/HeroGallery';
import galleryManifest from '@/generated/galleryManifest.json';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const categories = [
  { name: 'Dyski SSD i HDD', icon: HardDrive },
  { name: 'Pamięci RAM', icon: MemoryStick },
  { name: 'Karty i CPU', icon: Cpu },
  { name: 'Zasilacze i chłodzenia', icon: Power },
  { name: 'Peryferia', icon: Keyboard },
  { name: 'Kable i adaptery', icon: Cable },
];

const Store = () => {
  const { toast } = useToast();

  const handleCategoryClick = () => {
    toast({
      title: "🚧 Funkcja w budowie!",
      description: "Filtrowanie po kategoriach nie jest jeszcze zaimplementowane. Możesz o to poprosić w następnym komunikacie! 🚀",
    });
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Sklep komputerowy ByteClinic – części i akcesoria komputerowe Zgorzelec</title>
        <meta name="description" content="Kup części komputerowe i akcesoria – SSD, RAM, zasilacze, myszki, klawiatury. ByteClinic Zgorzelec – profesjonalny serwis i sklep online." />
      </Helmet>
      <div className="space-y-16 md:space-y-24">
        {/* Hero Section */}
        <motion.section 
          className="text-center py-10 md:py-12 rounded-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-[0_0_15px_hsl(var(--primary))]">
            Sklep ByteClinic
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Wszystko, czego potrzebujesz do modernizacji i naprawy swojego sprzętu.
          </p>
          {/* Gallery placed where the green frame was */}
          <div className="mt-8 max-w-6xl mx-auto px-2">
            <HeroGallery
              images={(galleryManifest?.images || []).map((src, i) => ({ src, alt: `Galeria ${i + 1}` }))}
            />
          </div>
        </motion.section>

        {/* Categories Section */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8 font-mono text-primary">Kategorie</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-28 md:h-32 flex flex-col items-center justify-center gap-2 text-center p-2 hover:bg-primary/10"
                  onClick={handleCategoryClick}
                >
                  <category.icon className="w-8 h-8 text-primary" />
                  <span className="text-xs md:text-sm text-foreground">{category.name}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Products List Section */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8 font-mono text-secondary">Polecane Produkty</h2>
          <ProductsList />
        </section>
      </div>
    </PageTransition>
  );
};

export default Store;
