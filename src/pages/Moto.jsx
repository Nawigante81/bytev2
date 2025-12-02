import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Car, Wrench, CheckSquare } from 'lucide-react';

const Moto = () => {
  const checklists = [
    {
      title: "Serwis olejowy",
      items: ["Olej 5W-30 (norma 507.00)", "Filtr oleju", "Filtr powietrza", "Filtr paliwa", "Filtr kabinowy"],
    },
    {
      title: "Kody błędów (VCDS)",
      items: ["16705 - Czujnik obrotów wału korbowego (G28)", "17964 - Regulacja ciśnienia doładowania", "01314 - Sterownik silnika"],
    },
    {
      title: "Szybkie tipy",
      items: ["Sprawdź stan pompowtryskiwaczy", "Kontroluj dwumasowe koło zamachowe", "Uważaj na rdzę na progach i błotnikach"],
    },
  ];

  return (
    <PageTransition>
      <Helmet>
        <title>Moto-Checklisty - ByteClinic</title>
        <meta name="description" content="Prywatne zapiski serwisowe dla Golfa V 1.9 TDI. Kody, części i szybkie porady." />
      </Helmet>
      <SectionWrapper>
        <SectionTitle subtitle="Prywatne zapiski serwisowe dla Golfa V 1.9 TDI (BKC).">Moto</SectionTitle>
        <div className="text-center mb-12">
          <Car className="w-24 h-24 mx-auto text-secondary" />
          <h3 className="font-mono text-2xl mt-4">VW Golf V 1.9 TDI</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {checklists.map((list, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-background/50 border-secondary/20 h-full">
                <CardHeader>
                  <CardTitle className="font-mono text-xl flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-secondary" />
                    {list.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {list.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2">
                        <CheckSquare className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default Moto;
