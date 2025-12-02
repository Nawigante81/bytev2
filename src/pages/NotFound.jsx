import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center h-full py-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <Helmet>
        <title>404 - Nie znaleziono - ByteClinic</title>
      </Helmet>
      <p className="font-mono text-8xl md:text-9xl font-bold text-primary">404</p>
      <h1 className="font-mono text-2xl md:text-4xl mt-4 uppercase">Strona nie znaleziona</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        Wygląda na to, że zabłądziłeś w cyfrowej przestrzeni. Sprawdź adres URL lub wróć na stronę główną.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/">Wróć na start</Link>
      </Button>
    </motion.div>
  );
};

export default NotFound;
