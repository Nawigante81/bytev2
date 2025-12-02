import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: '0%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-primary/20 p-4 z-50"
        >
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Cookie className="text-secondary w-8 h-8 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Używamy plików cookie, aby zapewnić najlepsze działanie naszej strony. To tylko techniczne ciasteczka, bez marketingowej waty.
              </p>
            </div>
            <Button onClick={handleAccept} size="sm" className="flex-shrink-0 w-full sm:w-auto">
              Ogarniam!
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;