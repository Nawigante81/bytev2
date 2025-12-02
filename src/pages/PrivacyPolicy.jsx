import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Helmet>
        <title>Polityka Prywatności – ByteClinic</title>
        <meta name="description" content="Polityka Prywatności serwisu ByteClinic – informacje o administratorze, zakresie i celach przetwarzania danych, cookies oraz prawach użytkownika." />
      </Helmet>

      <header className="mb-8">
        <h1 className="font-mono text-3xl md:text-4xl font-bold">
          <span className="mr-2" role="img" aria-label="puzzle">🧩</span>
          POLITYKA PRYWATNOŚCI – BYTECLINIC.PL
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Ostatnia aktualizacja: 27.10.2025</p>
      </header>

      <section className="prose prose-invert max-w-none prose-headings:font-mono prose-a:text-primary">
        <h2>1. Administrator danych</h2>
        <p>Administratorem danych osobowych jest:<br />
          <strong>ByteClinic – Serwis Komputerowy i Usługi IT</strong><br />
          Adres: Zgorzelec, Polska<br />
          E-mail: <a href="mailto:kontakt@byteclinic.pl">kontakt@byteclinic.pl</a><br />
          Strona: <a href="https://www.byteclinic.pl" target="_blank" rel="noopener noreferrer">https://www.byteclinic.pl</a>
        </p>

        <h2>2. Zakres przetwarzanych danych</h2>
        <p>Podczas korzystania z serwisu mogą być zbierane:</p>
        <ul>
          <li>dane przekazywane dobrowolnie (np. w formularzu kontaktowym: imię, e-mail, numer telefonu),</li>
          <li>dane automatycznie (adres IP, typ przeglądarki, cookies, dane analityczne).</li>
        </ul>

        <h2>3. Cele przetwarzania danych</h2>
        <p>Dane są przetwarzane w celu:</p>
        <ul>
          <li>udzielenia odpowiedzi na zapytania i realizacji usług,</li>
          <li>kontaktu z klientem,</li>
          <li>prowadzenia statystyk odwiedzin i analityki ruchu (np. Google Analytics),</li>
          <li>utrzymania bezpieczeństwa i poprawnego działania serwisu.</li>
        </ul>

        <h2>4. Podstawa prawna</h2>
        <p>Przetwarzanie danych odbywa się na podstawie:</p>
        <ul>
          <li>art. 6 ust. 1 lit. a RODO (zgoda),</li>
          <li>art. 6 ust. 1 lit. b RODO (wykonanie umowy lub działań przed jej zawarciem),</li>
          <li>art. 6 ust. 1 lit. f RODO (uzasadniony interes administratora).</li>
        </ul>

        <h2>5. Pliki cookies</h2>
        <p>Strona używa plików cookies do:</p>
        <ul>
          <li>prawidłowego działania strony,</li>
          <li>zapamiętywania preferencji użytkownika,</li>
          <li>prowadzenia statystyk ruchu.</li>
        </ul>
        <p>Możesz je wyłączyć w ustawieniach przeglądarki.</p>

        <h2>6. Udostępnianie danych</h2>
        <p>Dane mogą być przekazywane jedynie zaufanym podmiotom świadczącym usługi techniczne, takie jak hosting, analityka czy obsługa poczty (np. Google, Cloudflare). Dane nie są sprzedawane osobom trzecim.</p>

        <h2>7. Okres przechowywania</h2>
        <p>Dane przechowywane są przez czas niezbędny do realizacji celu, a następnie przez okres wymagany przepisami prawa lub do momentu cofnięcia zgody.</p>

        <h2>8. Prawa użytkownika</h2>
        <p>Masz prawo do:</p>
        <ul>
          <li>wglądu w swoje dane,</li>
          <li>sprostowania lub usunięcia danych,</li>
          <li>ograniczenia przetwarzania,</li>
          <li>przeniesienia danych,</li>
          <li>wniesienia sprzeciwu,</li>
          <li>cofnięcia zgody w dowolnym momencie (kontakt: <a href="mailto:kontakt@byteclinic.pl">kontakt@byteclinic.pl</a>).</li>
        </ul>

        <h2>9. Bezpieczeństwo danych</h2>
        <p>Administrator stosuje środki techniczne i organizacyjne, aby zapewnić bezpieczeństwo danych, w tym szyfrowanie transmisji (SSL) i kontrolę dostępu.</p>

        <h2>10. Zmiany polityki prywatności</h2>
        <p>Administrator zastrzega sobie prawo do wprowadzania zmian w polityce. Aktualna wersja dokumentu znajduje się zawsze na stronie <a href="https://www.byteclinic.pl" target="_blank" rel="noopener noreferrer">https://www.byteclinic.pl</a>.</p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
