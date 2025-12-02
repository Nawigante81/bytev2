import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const posts = [
  {
    slug: "szybki-audyt-domowego-wifi",
    title: "Szybki audyt domowego Wi-Fi: checklista na 10 min",
    excerpt: "Sprawdź, czy Twoja sieć jest bezpieczna i wydajna. Proste kroki, które możesz wykonać samodzielnie, bez specjalistycznego sprzętu.",
    imageAlt: "Router Wi-Fi na biurku obok laptopa, symbolizujący audyt sieci",
    imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=1964&auto=format&fit=crop",
  },
  {
    slug: "esp32-oled-szybki-start",
    title: "ESP32: OLED 128x64 - szybki start i pułapki",
    excerpt: "Jak szybko uruchomić popularny wyświetlacz z ESP32. Omawiam najczęstsze problemy i podaję gotowe fragmenty kodu.",
    imageAlt: "Mikrokontroler ESP32 podłączony do świecącego wyświetlacza OLED",
    imageUrl: "https://images.unsplash.com/photo-1617294255534-a835c13871a3?q=80&w=1740&auto=format&fit=crop",
  },
];

const Blog = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Blog - ByteClinic</title>
        <meta name="description" content="Poradniki, checklisty i zapiski z projektów. Krótko, technicznie i na temat." />
      </Helmet>
      <SectionWrapper>
        <SectionTitle subtitle="Zapiski z labu, poradniki i checklisty.">Blog</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-background/50 border-primary/20 h-full flex flex-col overflow-hidden group">
                <div className="aspect-video bg-muted overflow-hidden">
                  {post.slug === 'esp32-oled-szybki-start' ? (
                    <img alt={post.imageAlt} width="1280" height="720" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1630856713958-ba0c27a4ac8f" sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <img alt={post.imageAlt} width="1280" height="720" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={post.imageUrl} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 50vw" />
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="font-mono text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{post.excerpt}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/blog/${post.slug}`}>
                      Czytaj dalej <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default Blog;
