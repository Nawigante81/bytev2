import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';

const SuccessPage = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Płatność udana - ByteClinic</title>
        <meta name="description" content="Dziękujemy za Twoje zamówienie!" />
      </Helmet>
      <div className="flex flex-col items-center justify-center text-center py-20">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
        >
          <CheckCircle className="w-24 h-24 text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
        </motion.div>
        <motion.h1 
          className="text-4xl md:text-5xl font-bold mt-8 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Dziękujemy za zamówienie!
        </motion.h1>
        <motion.p 
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Twoja płatność została pomyślnie przetworzona. Otrzymasz e-mail z potwierdzeniem i szczegółami zamówienia.
        </motion.p>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Button asChild size="lg">
            <Link to="/sklep">
              Kontynuuj zakupy <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default SuccessPage;
