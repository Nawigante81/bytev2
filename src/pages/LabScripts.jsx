import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import { Loader2 } from 'lucide-react';

const LabScripts = () => {
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  return (
    <PageTransition>
      <Helmet>
        <title>Skrypty - Lab - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle="Zbiór przydatnych skryptów i automatyzacji">Skrypty</SectionTitle>
      
      <div className="relative w-full h-[80vh] bg-black/50 rounded-lg border border-primary/20 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        )}
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-muted-foreground">Nie udało się wczytać osadzonej strony.</p>
            <a className="underline text-primary" href="https://skrypty.byteclinic.pl/" target="_blank" rel="noreferrer">Otwórz w nowej karcie</a>
          </div>
        ) : (
          <iframe
            src="https://skrypty.byteclinic.pl/"
            title="Skrypty ByteClinic"
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default LabScripts;
