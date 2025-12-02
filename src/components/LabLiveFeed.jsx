import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const logMessages = [
  { status: 'OK', message: 'Diagnostyka: Dell Latitude – zakończono', color: 'text-green-400' },
  { status: 'RUN', message: 'Odzyskiwanie danych: Samsung EVO', color: 'text-blue-400' },
  { status: 'WARN', message: 'Wysoka temp: HP Omen – w kolejce', color: 'text-yellow-400' },
  { status: 'INFO', message: 'Instalacja Windows – 32%', color: 'text-cyan-400' },
  { status: 'OK', message: 'Optymalizacja systemu – zakończono', color: 'text-green-400' },
  { status: 'RUN', message: 'Backup danych: Seagate External', color: 'text-blue-400' },
  { status: 'WARN', message: 'Niskie miejsce: Disk C: – 15%', color: 'text-yellow-400' },
  { status: 'INFO', message: 'Aktualizacja sterowników – 67%', color: 'text-cyan-400' },
  { status: 'RUN', message: 'Skanowanie antywirusowe: ThinkPad X1', color: 'text-blue-400' },
  { status: 'OK', message: 'Wymiana pasty termoprzewodzącej – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Konfiguracja sieci Wi-Fi – 89%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błąd CRC: Dysk SSD Samsung', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Migrowanie systemu: MacBook Pro', color: 'text-blue-400' },
  { status: 'OK', message: 'Czyszczenie rejestru – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Instalacja oprogramowania – 45%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Przegrzewanie GPU: ASUS ROG', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Defragmentacja dysku HDD', color: 'text-blue-400' },
  { status: 'OK', message: 'Test pamięci RAM – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Kopiowanie plików – 76%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Niski poziom baterii: iPhone 14', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Kalibracja ekranu: Surface Pro', color: 'text-blue-400' },
  { status: 'OK', message: 'Aktualizacja BIOS – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Szyfrowanie dysku – 23%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błędy w logach: Windows Event', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Synchronizacja z chmurą: OneDrive', color: 'text-blue-400' },
  { status: 'OK', message: 'Naprawa bootloadera – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Instalacja Ubuntu – 56%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Uszkodzone sektory: WD Blue 1TB', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test wydajności: Core i7-12700K', color: 'text-blue-400' },
  { status: 'OK', message: 'Reinstalacja sterowników – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Formatowanie partycji – 34%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Konieczna wymiana: Wentylator CPU', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Montowanie dysku: Docker Containers', color: 'text-blue-400' },
  { status: 'OK', message: 'Optymalizacja startu systemu – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Kompilacja kodu – 91%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Konflikt portów: 8080 zajęty', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Monitorowanie temperatur: LM-Sensors', color: 'text-blue-400' },
  { status: 'OK', message: 'Przywracanie systemu – zakończono', color: 'text-green-400' },
  { status: 'RUN', message: 'Diagnostyka sieci: Ping test 8.8.8.8', color: 'text-blue-400' },
  { status: 'INFO', message: 'Archiwizacja plików – 88%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Przestarzały firmware: Router TP-Link', color: 'text-yellow-400' },
  { status: 'OK', message: 'Czyszczenie tymczasowych plików – zakończono', color: 'text-green-400' },
  { status: 'RUN', message: 'Skanowanie dysku M.2 NVMe', color: 'text-blue-400' },
  { status: 'INFO', message: 'Instalacja Visual Studio Code – 67%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błędne sektory: Kingston SSD 500GB', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Kalibracja kolorów: Eizo ColorEdge', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja VPN – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Renderowanie wideo – 45%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Przegrzewanie: Ryzen 9 5900X', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test stabilności: Prime95', color: 'text-blue-400' },
  { status: 'OK', message: 'Aktualizacja macOS – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Kopiowanie danych z iPhone – 23%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Niski poziom pamięci: RAM usage 95%', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Naprawa partycji RAW: Disk Recovery', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja fontsów – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Aktualizacja npm packages – 78%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Konflikt DLL: MSVCP140.dll missing', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Synchronizacja Git: remote origin', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja DNS – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Instalacja Python 3.11 – 89%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Uszkodzona biblioteka: libGL.so.1', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test podzespołów: AIDA64', color: 'text-blue-400' },
  { status: 'OK', message: 'Naprawa Windows Store – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Konfiguracja Apache – 34%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błędne uprawnienia: /var/log/', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Instalacja Kubernetes cluster', color: 'text-blue-400' },
  { status: 'OK', message: 'Optymalizacja GPU drivers – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Backup bazy MySQL – 56%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Proces zombie: PID 2847', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test latency: ping to Cloudflare', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja iptables – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Instalacja Docker – 72%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Konieczny restart: System Integrity', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Skanowanie portów: Nmap scan', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja .NET 8.0 – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Kompilacja C++ project – 67%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błędny hash: SHA256 mismatch', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test sieci WiFi: speed test', color: 'text-blue-400' },
  { status: 'OK', message: 'Aktualizacja firmware router – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Instalacja Redis – 45%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Przestarzały certyfikat SSL', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Konfiguracja load balancer', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja Node.js LTS – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Deploy aplikacji – 83%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Wysokie zużycie CPU: Chrome tabs', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test API endpoints: Postman', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja SSL cert – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Building React app – 91%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Brak dostępu: /etc/ssh/sshd_config', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Konfiguracja Jenkins pipeline', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja TensorFlow – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Machine learning model training – 23%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Ostrzeżenie: Memory leak detected', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Database migration: PostgreSQL', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja monitoring: Grafana – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Analiza logów: ELK stack – 67%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Przekroczono limit: API rate limit', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Konfiguracja message queue: RabbitMQ', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja MongoDB – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Database indexing – 89%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błędna konfiguracja: CORS policy', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Test wydajności: JMeter load test', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja CI/CD – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Instalacja Kubernetes dashboard – 45%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Pod exceeded CPU limit', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Monitoring system metrics: Prometheus', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja email server – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Import danych: CSV import – 78%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Nieprawidłowy format: JSON schema', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Generowanie raportów: PDF export', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja analytics tools – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Data processing pipeline – 56%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Błąd połączenia: Redis timeout', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Konfiguracja webhooks: Slack integration', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja logging tools – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Security scan: OWASP ZAP – 34%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Vulnerability found: CVE-2023-1234', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Penetration testing: Metasploit', color: 'text-blue-400' },
  { status: 'OK', message: 'Konfiguracja firewall rules – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Code review process – 67%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Zależność nieaktualna: security patch available', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Static code analysis: SonarQube', color: 'text-blue-400' },
  { status: 'OK', message: 'Instalacja development tools – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'Code compilation – 89%', color: 'text-cyan-400' },
  { status: 'WARN', message: 'Warning: Unused variables in module', color: 'text-yellow-400' },
  { status: 'RUN', message: 'Unit tests execution: Jest', color: 'text-blue-400' },
  { status: 'OK', message: 'Integration tests – zakończono', color: 'text-green-400' },
  { status: 'INFO', message: 'End-to-end testing – 23%', color: 'text-cyan-400' },
];

const statusColors = {
  OK: 'text-green-400',
  RUN: 'text-blue-400', 
  WARN: 'text-yellow-400',
  INFO: 'text-cyan-400',
};

const LabLiveFeed = () => {
  const [currentLogs, setCurrentLogs] = useState([]);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const newLog = logMessages[logIndex];
      setCurrentLogs(prev => [...prev.slice(-4), newLog]);
      setLogIndex((prev) => (prev + 1) % logMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [logIndex]);

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 text-center">
        <p className="font-mono text-sm md:text-base text-foreground/90">
          <span className="text-primary">MINI</span> „LAB LIVE FEED" – statusy w stylu cyberpunk
        </p>
      </div>

      {/* Terminal Container */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/30 to-lime-400/40 w-full">
        <div className="relative rounded-2xl bg-black/90 backdrop-blur-md overflow-hidden font-mono">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border-b border-primary/30">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-xs text-gray-400 ml-4">lab-live-feed@byteclinic:~$</span>
            <div className="ml-auto">
              <motion.div
                className="w-2 h-4 bg-green-400"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-4 h-48 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {currentLogs.map((log, index) => (
                <motion.div
                  key={`${log.message}-${index}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 mb-1 text-sm"
                >
                  <span className="text-gray-500">[</span>
                  <motion.span 
                    className={cn("font-bold", statusColors[log.status])}
                    animate={{ textShadow: ["0 0 5px currentColor", "0 0 10px currentColor", "0 0 5px currentColor"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {log.status}
                  </motion.span>
                  <span className="text-gray-500">]</span>
                  <span className="text-gray-300">{log.message}</span>
                  <motion.span 
                    className="ml-auto text-xs text-gray-600"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    •
                  </motion.span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Blinking cursor line */}
            <motion.div 
              className="flex items-center gap-2 text-sm text-green-400"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            >
              <span className="text-gray-500">[</span>
              <span className="font-bold">LIVE</span>
              <span className="text-gray-500">]</span>
              <span className="text-gray-300">System monitoring aktywny...</span>
              <motion.span 
                className="ml-auto"
                animate={{ 
                  backgroundColor: ["rgb(34 197 94)", "transparent"],
                  boxShadow: ["0 0 5px rgb(34 197 94)", "0 0 0px transparent"]
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ▮
              </motion.span>
            </motion.div>
          </div>

          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <motion.div
              className="absolute inset-0 rounded-2xl border border-primary/20"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(34, 211, 238, 0.1)",
                  "0 0 40px rgba(168, 85, 247, 0.2)",
                  "0 0 20px rgba(34, 211, 238, 0.1)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabLiveFeed;