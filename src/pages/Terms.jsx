import React from 'react';
import { Helmet } from 'react-helmet-async';

const Terms = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Helmet>
        <title>Regulamin – ByteClinic</title>
        <meta name="description" content="Regulamin serwisu ByteClinic – zasady korzystania, odpowiedzialność, prawa autorskie i kontakt." />
      </Helmet>

      <header className="mb-8">
        <h1 className="font-mono text-3xl md:text-4xl font-bold">
          <span className="mr-2" role="img" aria-label="gear">⚙️</span>
          REGULAMIN SERWISU BYTECLINIC.PL
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Ostatnia aktualizacja: 27.10.2025</p>
      </header>

      <section className="prose prose-invert max-w-none prose-headings:font-mono prose-a:text-primary">
        <h2>1. Postanowienia ogólne</h2>
        <p>
          Niniejszy regulamin określa zasady korzystania ze strony internetowej ByteClinic.pl, prowadzonej przez:<br />
          <strong>ByteClinic – Serwis Komputerowy i Usługi IT, Zgorzelec, Polska.</strong><br />
          Kontakt: <a href="mailto:kontakt@byteclinic.pl">kontakt@byteclinic.pl</a>
        </p>

        <h2>2. Zakres usług</h2>
        <p>Serwis udostępnia informacje o działalności, ofercie usług IT i serwisu komputerowego, a także umożliwia kontakt i rezerwację usług.</p>

        <h2>3. Warunki korzystania z serwisu</h2>
        <ul>
          <li>Użytkownik korzysta z serwisu dobrowolnie.</li>
          <li>Zabronione jest dostarczanie treści bezprawnych, prób ataków, spamowania i działań zakłócających działanie strony.</li>
          <li>Administrator może czasowo ograniczyć dostęp do strony w celach technicznych lub bezpieczeństwa.</li>
        </ul>

        <h2>4. Odpowiedzialność</h2>
        <ul>
          <li>Administrator nie ponosi odpowiedzialności za błędy, przerwy w działaniu strony ani skutki użycia informacji zawartych w serwisie.</li>
          <li>Użytkownik korzysta z serwisu na własną odpowiedzialność.</li>
        </ul>

        <h2>5. Zamówienia i kontakt</h2>
        <p>
          Wszelkie zgłoszenia serwisowe i zapytania są obsługiwane indywidualnie przez formularz, telefon lub e-mail.<br />
          Ceny i terminy realizacji ustalane są indywidualnie.
        </p>

        <h2>6. Prawa autorskie</h2>
        <p>
          Wszelkie treści, grafiki, logo, zdjęcia i kod strony są własnością ByteClinic, chyba że wskazano inaczej.<br />
          Kopiowanie, rozpowszechnianie i modyfikacja bez zgody jest zabronione.
        </p>

        <h2>7. Ochrona danych osobowych</h2>
        <p>
          Zasady dotyczące ochrony danych osobowych opisuje Polityka Prywatności, dostępna na stronie
          {' '}<a href="/polityka-prywatnosci">https://www.byteclinic.pl/polityka-prywatnosci</a>.
        </p>

        <h2>8. Postanowienia końcowe</h2>
        <ul>
          <li>Korzystanie ze strony oznacza akceptację niniejszego regulaminu.</li>
          <li>Administrator zastrzega sobie prawo do wprowadzania zmian.</li>
          <li>Aktualna wersja regulaminu jest zawsze dostępna na stronie <a href="/regulamin">https://www.byteclinic.pl/regulamin</a>.</li>
        </ul>
      </section>
    </div>
  );
};

export default Terms;
