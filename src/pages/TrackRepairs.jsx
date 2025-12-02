import React from 'react';
import PageTransition from '@/components/PageTransition';
import MetaTags from '@/components/MetaTags';
import SectionWrapper from '@/components/SectionWrapper';
import SectionTitle from '@/components/SectionTitle';
import RepairTracker from '@/components/RepairTracker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Star,
  Phone
} from 'lucide-react';

const TrackRepairs = () => {
  return (
    <PageTransition>
      <MetaTags
        title="Śledzenie napraw - ByteClinic | Real-time monitoring postępu"
        description="Śledź status swoich napraw online 24/7. Real-time monitoring postępu, zdjęcia z naprawy, powiadomienia SMS. Transparentność w serwisie ByteClinic Zgorzelec."
        image="/images/glowne.webp"
        url="https://www.byteclinic.pl/sledzenie-napraw"
        type="website"
      />

      <SectionWrapper>
        <SectionTitle 
          subtitle="Monitoruj postęp swoich napraw w czasie rzeczywistym"
        />
        
        <RepairTracker />
        
        {/* Stats Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono">24h</div>
              <div className="text-sm text-muted-foreground">Średni czas diagnozy</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-2xl font-bold font-mono">98%</div>
              <div className="text-sm text-muted-foreground">Napraw zakończonych</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold font-mono">2%</div>
              <div className="text-sm text-muted-foreground">Wymagających dodatkowej diagnostyki</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono">4.9</div>
              <div className="text-sm text-muted-foreground">Średnia ocena (254 opinie)</div>
            </CardContent>
          </Card>
        </div>

        {/* Status Explanation */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-center mb-8 font-mono text-primary">
            📊 Status napraw - co oznaczają?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  <Search className="w-3 h-3 mr-1" />
                  Przyjęte
                </Badge>
                <span className="text-sm text-muted-foreground">Otrzymaliśmy zlecenie</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Urządzenie zostało przyjęte do serwisu i wprowadzone do systemu. 
                Wkrótce rozpoczniemy diagnostykę.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Zdiagnozowane
                </Badge>
                <span className="text-sm text-muted-foreground">Problem zidentyfikowany</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Wykonaliśmy diagnostykę i zidentyfikowaliśmy problem. 
                Czekamy na akceptację kosztorysu od klienta.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  <Clock className="w-3 h-3 mr-1" />
                  W naprawie
                </Badge>
                <span className="text-sm text-muted-foreground">Trwają prace</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Rozpoczęliśmy naprawę. Wymieniamy uszkodzone części 
                i przeprowadzamy niezbędne naprawy.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Testowanie
                </Badge>
                <span className="text-sm text-muted-foreground">Kontrola jakości</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Przeprowadzamy testy funkcjonalności po naprawie. 
                Sprawdzamy wszystkie systemy i funkcje urządzenia.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Gotowe
                </Badge>
                <span className="text-sm text-muted-foreground">Naprawa zakończona</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Urządzenie zostało naprawione i przetestowane. 
                Czekamy na odbiór przez klienta.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <Users className="w-3 h-3 mr-1" />
                  Gotowe do odbioru
                </Badge>
                <span className="text-sm text-muted-foreground">Można odbierać</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Urządzenie jest gotowe do odbioru. Otrzymasz SMS 
                z informacją o możliwości odbioru.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-center mb-8 font-mono text-primary">
            ✨ Dlaczego warto śledzić naprawy online?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Real-time updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj natychmiastowe powiadomienia o każdym etapie naprawy. 
                    Nigdy więcej niepewności co dzieje się z Twoim sprzętem.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Pełna transparentność</h4>
                  <p className="text-sm text-muted-foreground">
                    Zobacz dokładnie jakie części wymieniamy, ile to kosztuje 
                    i jakie prace wykonujemy. Bez ukrytych kosztów.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Łatwy kontakt</h4>
                  <p className="text-sm text-muted-foreground">
                    W każdej chwili możesz zadzwonić do naszego serwisu 
                    lub wysłać wiadomość przez system.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Historia napraw</h4>
                  <p className="text-sm text-muted-foreground">
                    Dostęp do pełnej historii wszystkich napraw, 
                    zdjęć przed/po oraz dokumentacji technicznej.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Zdjęcia z napraw</h4>
                  <p className="text-sm text-muted-foreground">
                    Zobacz zdjęcia swojego sprzętu podczas naprawy. 
                    Dokumentujemy każdy etap dla Twojej pewności.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Alerty i powiadomienia</h4>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj powiadomienia o opóźnieniach, dodatkowych 
                    problemach lub gotowości do odbioru.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-8 border border-primary/20">
            <h3 className="text-2xl font-bold mb-4">
              Masz pytania o status swojej naprawy?
            </h3>
            <p className="text-muted-foreground mb-6">
              Skontaktuj się z nami w dowolny sposób - pomożemy Ci śledzić postęp
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <a href="tel:+48724316523">
                  📞 Zadzwoń: +48 724 316 523
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/kontakt">
                  📝 Napisz do nas
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/booking">
                  📅 Umów wizytę
                </a>
              </Button>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </PageTransition>
  );
};

export default TrackRepairs;