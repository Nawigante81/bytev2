import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Cat } from 'lucide-react';

const Cats = () => {
  const catPhotos = [
    {
      name: "Peżyna",
      description: "Królowa drzemek i mistrzyni kamuflażu.",
      image: "Czarno-biały kot śpiący na kanapie",
    },
    {
      name: "Masianka",
      description: "Ekspertka od polowań na laserowy wskaźnik.",
      image: "Rudy kot bawiący się czerwoną kropką lasera",
    },
    {
      name: "Razem",
      description: "Chwila rozejmu w przerwie na posiłek.",
      image: "Dwa koty jedzące z jednej miski",
    },
  ];

  return (
    <PageTransition>
      <Helmet>
        <title>Koty - ByteClinic</title>
        <meta name="description" content="Nasi futrzaści kierownicy projektu: Peżyna i Masianka." />
      </Helmet>
      <SectionWrapper>
        <SectionTitle subtitle="Nasi futrzaści kierownicy projektu.">Cats 😼</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {catPhotos.map((cat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, rotate: Math.random() * 10 - 5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 100, delay: index * 0.1 }}
            >
              <Card className="bg-background/50 border-primary/20 overflow-hidden group">
                <div className="aspect-square bg-muted overflow-hidden">
                  <img alt={cat.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="https://images.unsplash.com/photo-1693303552101-3951f8b0c025" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-mono text-xl font-bold text-primary flex items-center gap-2">
                    <Cat className="w-5 h-5" />
                    {cat.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">{cat.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default Cats;
