import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const mockReviews = [
    { id: 1, rating: 5, title: "Profesjonalizm!", message: "Naprawa laptopa przebiegła błyskawicznie. Działa jak nowy!", profile: { display_name: "Jan K." }, created_at: "2025-09-20T10:00:00Z" },
    { id: 2, rating: 5, title: "Uratowane dane", message: "Myślałam, że straciłam wszystkie zdjęcia z wakacji. ByteClinic odzyskał wszystko!", profile: { display_name: "Anna Z." }, created_at: "2025-09-18T14:30:00Z" },
    { id: 3, rating: 4, title: "Dobry kontakt", message: "Świetny kontakt i doradztwo przy projekcie IoT. Mały minus za termin, ale jakość super.", profile: { display_name: "Piotr S." }, created_at: "2025-09-15T09:00:00Z" },
    { id: 4, rating: 5, title: "Polecam w 100%", message: "Szybka diagnoza i uczciwa wycena. Na pewno wrócę, jeśli będzie potrzeba.", profile: { display_name: "Ewa N." }, created_at: "2025-09-12T18:00:00Z" },
    { id: 5, rating: 5, title: "Problem z Wi-Fi rozwiązany", message: "Męczyłem się z zasięgiem od miesięcy. Godzina pracy i internet śmiga w całym domu.", profile: { display_name: "Tomasz B." }, created_at: "2025-09-10T11:00:00Z" },
    { id: 6, rating: 5, title: "Czysto i sprawnie", message: "Komputer po czyszczeniu jest cichy i chłodny. Różnica jest ogromna.", profile: { display_name: "Magdalena W." }, created_at: "2025-09-08T16:45:00Z" },
];

const ReviewsCarousel = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [[page, direction], setPage] = useState([0, 0]);
  const containerRef = useRef(null);

  const paginate = (newDirection) => {
    setPage([page + newDirection, newDirection]);
  };

  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  };

  const [visibleCount, setVisibleCount] = useState(getVisibleCount());

  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const reviewIndex = Math.abs(page % reviews.length);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    // Pobieramy opinie bez zależności od tabeli profiles
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, title, message, created_at, user_id')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Błąd pobierania opinii z bazy:', error.message);
      // Używamy mockReviews z dodatkowymi polami potrzebnymi dla komponentu
      setReviews(mockReviews.map(review => ({
        ...review,
        user_id: null // Brak powiązania z user_id dla mock danych
      })));
    } else {
      // Mapujemy dane z bazy do struktury oczekiwanej przez komponent
      const mappedReviews = data.map(review => ({
        ...review,
        profile: {
          display_name: `Użytkownik ${review.user_id ? review.user_id.substring(0, 8) : 'Anonim'}`
        }
      }));
      setReviews(mappedReviews.length > 0 ? mappedReviews : mockReviews);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (reviews.length > visibleCount) {
      const timer = setTimeout(() => paginate(1), 5000);
      return () => clearTimeout(timer);
    }
  }, [page, reviews.length, visibleCount]);

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const getPageIndices = () => {
    const indices = [];
    for (let i = 0; i < visibleCount; i++) {
      indices.push((reviewIndex + i) % reviews.length);
    }
    return indices;
  };

  if (loading) {
    return <div className="flex justify-center p-16"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (reviews.length === 0) {
    return <p className="text-center text-muted-foreground p-16">Brak opinii do wyświetlenia.</p>;
  }

  return (
    <div className="relative flex items-center justify-center" ref={containerRef}>
      {reviews.length > visibleCount && (
        <>
          <Button variant="outline" size="icon" className="absolute -left-4 top-1/2 -translate-y-1/2 z-20" onClick={() => paginate(-1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" className="absolute -right-4 top-1/2 -translate-y-1/2 z-20" onClick={() => paginate(1)}><ChevronRight /></Button>
        </>
      )}
      <div className="overflow-hidden relative w-full h-[320px]">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
            className="absolute w-full h-full grid gap-4"
            style={{ gridTemplateColumns: `repeat(${visibleCount}, 1fr)` }}
          >
            {getPageIndices().map(i => (
              <Card key={reviews[i].id} className="bg-card/80 border-secondary/20 backdrop-blur-sm h-full flex flex-col justify-between">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-mono text-lg text-secondary">{reviews[i].title}</CardTitle>
                    <div className="flex gap-1 flex-shrink-0">
                      {[...Array(5)].map((_, starIndex) => (
                        <Star key={starIndex} className={cn("w-4 h-4", starIndex < reviews[i].rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground italic">"{reviews[i].message}"</p>
                </CardContent>
                <div className="p-6 pt-0 text-right">
                  <p className="font-bold font-mono text-primary">- {reviews[i].profile?.display_name || 'Anonim'}</p>
                </div>
              </Card>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReviewsCarousel;