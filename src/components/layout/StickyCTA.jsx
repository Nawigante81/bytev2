import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

const StickyCTA = () => {
  return (
    <motion.div
      initial={{ y: 200 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 1 }}
      className="sticky-cta fixed bottom-0 left-0 right-0 md:hidden bg-background/85 backdrop-blur-md p-3 border-t border-primary/20 z-40"
    >
      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" variant="secondary" className="w-full">
          <a href="tel:+48724316523">Zadzwoń</a>
        </Button>
        <Button asChild size="lg" className="w-full">
          <Link to="/kontakt">
            <Wrench className="mr-2 h-5 w-5" />
            Zgłoś usterkę
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default StickyCTA;