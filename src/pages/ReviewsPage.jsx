import React from 'react';
import { Helmet } from 'react-helmet-async';
import SectionTitle from '@/components/SectionTitle';
import PageTransition from '@/components/PageTransition';
import ReviewsCarousel from '@/components/ReviewsCarousel';

const ReviewsPage = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Opinie Klientów - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle="Co klienci mówią o naszej pracy.">Opinie</SectionTitle>
      
      <div className="py-8">
        <ReviewsCarousel />
      </div>
    </PageTransition>
  );
};

export default ReviewsPage;
