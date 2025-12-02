import React from 'react';
import PageTransition from '@/components/PageTransition';
import MetaTags from '@/components/MetaTags';
import SectionWrapper from '@/components/SectionWrapper';
import SectionTitle from '@/components/SectionTitle';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BookingSystem from '@/components/BookingSystem';
import { Clock, CheckCircle, Phone } from 'lucide-react';

const Booking = () => {
  return (
    <PageTransition>
      <MetaTags
        title="Rezerwacja wizyty - ByteClinic | Umów spotkanie online"
        description="Zarezerwuj wizytę w serwisie ByteClinic w kilku kliknięciach. Szybka diagnoza, naprawy, konsultacje IT. Potwierdzenie SMS, elastyczne terminy w Zgorzelcu."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/rezerwacja"
        type="website"
      />

      <SectionWrapper>
        <SectionTitle 
          subtitle="Umów się na wizytę w kilku prostych krokach"
        >
          🚀 Rezerwacja Online
        </SectionTitle>
        
        <BookingSystem />
        
        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Elastyczne terminy</h3>
              <p className="text-sm text-muted-foreground">
                Dostępne terminy od poniedziałku do piątku, 9:00-17:00. 
                Odbiór darmowy na terenie Zgorzelca.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Potwierdzenie SMS</h3>
              <p className="text-sm text-muted-foreground">
                Automatyczne potwierdzenie rezerwacji oraz przypomnienie 
                o wizycie na 24h przed terminem.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Zmiana terminu</h3>
              <p className="text-sm text-muted-foreground">
                Możliwość bezpłatnej zmiany terminu do 24h przed wizytą. 
                Zadzwoń: +48 724 316 523
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-center mb-8 font-mono text-primary">
            ❓ Najczęściej zadawane pytania
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Jak długo trwa diagnoza?</h4>
                <p className="text-sm text-muted-foreground">
                  Standardowa diagnoza zajmuje 1-2 godziny. W przypadku złożonych 
                  problemów kontaktujemy się z klientem w ciągu 24h.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Czy mogę zostawić sprzęt bez umówienia?</h4>
                <p className="text-sm text-muted-foreground">
                  Tak, ale rekomendujemy rezerwację terminu aby uniknąć oczekiwania. 
                  Możesz też zadzwonić i zapytać o dostępne terminy.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Jakie są formy płatności?</h4>
                <p className="text-sm text-muted-foreground">
                  Akceptujemy gotówkę, przelewy bankowe oraz BLIK. 
                  Płatność następuje po wykonaniu usługi.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Czy jest gwarancja na naprawy?</h4>
                <p className="text-sm text-muted-foreground">
                  Tak, udzielamy gwarancji na wykonaną usługę oraz na wymienione 
                  części. Standardowo 3 miesiące, na niektóre części do 12 miesięcy.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Czy wykonujecie naprawy na miejscu?</h4>
                <p className="text-sm text-muted-foreground">
                  Tak, w przypadku drobnych napraw możemy przyjechać do klienta 
                  na terenie Zgorzelca i okolic (dodatkowa opłata za dojazd).
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Czy można monitorować postęp naprawy?</h4>
                <p className="text-sm text-muted-foreground">
                  Tak! Po przyjęciu sprzętu otrzymasz numer zlecenia, którym możesz 
                  śledzić postęp naprawy online w naszym systemie.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-8 border border-primary/20">
            <h3 className="text-2xl font-bold mb-4">
              Masz pytania? Skontaktuj się z nami!
            </h3>
            <p className="text-muted-foreground mb-6">
              Nasz zespół jest gotowy pomóc Ci z każdym problemem technicznym
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <a href="tel:+48724316523">
                  📞 Zadzwoń: +48 724 316 523
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="mailto:kontakt@byteclinic.pl">
                  ✉️ Email: kontakt@byteclinic.pl
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/kontakt">
                  📝 Formularz kontaktowy
                </a>
              </Button>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default Booking;