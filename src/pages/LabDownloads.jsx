import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionTitle from '@/components/SectionTitle';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Tooltip from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { Download, Computer as Windows, Code, HardDrive, Settings, MonitorSmartphone } from 'lucide-react';

// Helper: build small vendor icon via DuckDuckGo (fast, tiny)
const vendorIcon = (url) => {
  try {
    const host = new URL(url).hostname;
    return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch {
    return undefined;
  }
};

// Attempt to auto-fetch version/size (best-effort; falls back to static)
const useAutoMeta = (program) => {
  const [meta, setMeta] = useState({ version: program.version, size: program.size });

  useEffect(() => {
    let cancelled = false;

    const setIf = (patch) => { if (!cancelled) setMeta((m) => ({ ...m, ...patch })); };

    const headSize = async (url) => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) return { size: null, filename: null };
        const len = res.headers.get('content-length');
        const disp = res.headers.get('content-disposition');
        const size = len ? `${(Number(len) / (1024 * 1024)).toFixed(0)} MB` : null;
        return { size, filename: disp || null };
      } catch { return { size: null, filename: null }; }
    };

    const fetchJSON = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    };

    const fetchVSCode = async () => {
      try {
        const arr = await fetchJSON('https://update.code.visualstudio.com/api/releases/stable?os=win32-x64');
        if (Array.isArray(arr) && arr[0]) setIf({ version: arr[0] });
      } catch {}
      const { size } = await headSize('https://update.code.visualstudio.com/latest/win32-x64-user/stable');
      if (size) setIf({ size });
    };

    const fetchAdwCleaner = async () => {
      const { size, filename } = await headSize('https://downloads.malwarebytes.com/file/adwcleaner');
      if (size) setIf({ size });
      if (filename) {
        const m = filename.match(/[\d]+(?:\.[\d]+)+/);
        if (m) setIf({ version: m[0] });
      }
    };

    const fetchMalwarebytes = async () => {
      const { size } = await headSize('https://downloads.malwarebytes.com/file/mb-windows');
      if (size) setIf({ size });
    };

    const fetchNordVPN = async () => {
      const { size } = await headSize('https://downloads.nordcdn.com/apps/windows/NordVPN/latest/NordVPN.exe');
      if (size) setIf({ size });
    };

    const fetchKeePassXC = async () => {
      const data = await fetchJSON('https://api.github.com/repos/keepassxreboot/keepassxc/releases/latest');
      if (data?.tag_name) setIf({ version: data.tag_name.replace(/^v/i,'') });
      const asset = data?.assets?.find(a => /win.*(x64|64).*\.(msi|exe)$/i.test(a.name)) || data?.assets?.find(a => /windows|win/i.test(a.name));
      if (asset?.size) setIf({ size: `${(asset.size / (1024 * 1024)).toFixed(0)} MB` });
    };

    const fetchVeraCrypt = async () => {
      const data = await fetchJSON('https://api.github.com/repos/veracrypt/VeraCrypt/releases/latest');
      if (data?.tag_name) setIf({ version: data.tag_name.replace(/^v/i,'') });
      const asset = data?.assets?.find(a => /Setup.*(x64|64).*\.exe$/i.test(a.name)) || data?.assets?.find(a => /Windows|Win/i.test(a.name));
      if (asset?.size) setIf({ size: `${(asset.size / (1024 * 1024)).toFixed(0)} MB` });
    };

    const fetchClamAV = async () => {
      const data = await fetchJSON('https://api.github.com/repos/Cisco-Talos/clamav/releases/latest');
      if (data?.tag_name) setIf({ version: data.tag_name.replace(/^v/i,'') });
      // Windows asset may not exist; if present, try to use its size
      const asset = data?.assets?.find(a => /win|windows/i.test(a.name));
      if (asset?.size) setIf({ size: `${(asset.size / (1024 * 1024)).toFixed(0)} MB` });
    };

    const fetchFromGitHub = async (repo, assetRegex = /(win|windows|x64|64|amd64|msi|exe|dmg|appimage)/i) => {
      const data = await fetchJSON(`https://api.github.com/repos/${repo}/releases/latest`);
      if (!data) return;
      if (data?.tag_name) setIf({ version: String(data.tag_name).replace(/^v/i,'') });
      let asset = null;
      if (Array.isArray(data?.assets)) {
        asset = data.assets.find(a => assetRegex.test(a.name)) || data.assets[0];
      }
      if (asset?.size) setIf({ size: `${(asset.size / (1024 * 1024)).toFixed(0)} MB` });
    };

    const fetchNotepadPP = () => fetchFromGitHub('notepad-plus-plus/notepad-plus-plus', /(win|windows|x64|64).*(msi|exe)$/i);
    const fetchAtom = () => fetchFromGitHub('atom/atom');
    const fetchArduinoIDE = () => fetchFromGitHub('arduino/arduino-ide', /(win|windows|x64|64).*(msi|exe)$/i);
    const fetchGHDesktop = () => fetchFromGitHub('desktop/desktop', /(win|windows|x64|64).*(exe|msi)|setup.*(exe|msi)/i);
    const fetchAngryIP = () => fetchFromGitHub('angryip/ipscan', /(win|windows|x64|64).*(exe|msi)|portable.*(exe)/i);
    const fetchAudacity = () => fetchFromGitHub('audacity/audacity', /(win|windows|x64|64).*(exe|msi)/i);
    const fetchOBS = () => fetchFromGitHub('obsproject/obs-studio', /(win|windows|x64|64).*(exe|msi)/i);
    const fetchInkscape = () => fetchFromGitHub('inkscape/inkscape', /(win|windows|x64|64).*(msi|exe)|windows/i);
    const fetchShotcut = () => fetchFromGitHub('mltframework/shotcut', /(win|windows|x64|64).*(exe|msi)|windows/i);
    const fetchHandBrake = () => fetchFromGitHub('HandBrake/HandBrake', /(win|windows|x64|64).*(exe|msi)/i);
    const fetchDarktable = () => fetchFromGitHub('darktable-org/darktable');
    const fetchRufus = () => fetchFromGitHub('pbatard/rufus', /(win|windows|x64|64).*(exe|msi)/i);
    const fetchEtcher = () => fetchFromGitHub('balena-io/etcher');

    (async () => {
      const n = program.name.toLowerCase();
      if (n.includes('visual studio code')) await fetchVSCode();
      else if (n.includes('adwcleaner')) await fetchAdwCleaner();
      else if (n === 'malwarebytes') await fetchMalwarebytes();
      else if (n.includes('nordvpn')) await fetchNordVPN();
      else if (n.includes('keepassxc')) await fetchKeePassXC();
      else if (n.includes('veracrypt')) await fetchVeraCrypt();
      else if (n.includes('clamav')) await fetchClamAV();
      else if (n.includes('notepad++')) await fetchNotepadPP();
      else if (n.includes('atom')) await fetchAtom();
      else if (n.includes('arduino ide')) await fetchArduinoIDE();
      else if (n.includes('github desktop')) await fetchGHDesktop();
      else if (n.includes('angry ip')) await fetchAngryIP();
      else if (n.includes('audacity')) await fetchAudacity();
      else if (n.includes('obs')) await fetchOBS();
      else if (n.includes('inkscape')) await fetchInkscape();
      else if (n.includes('shotcut')) await fetchShotcut();
      else if (n.includes('handbrake')) await fetchHandBrake();
      else if (n.includes('darktable')) await fetchDarktable();
      else if (n.includes('rufus')) await fetchRufus();
      else if (n.includes('etcher')) await fetchEtcher();
      // For other vendors (Avast, Kaspersky, Bitdefender, Spybot, IntelliJ, PyCharm, Docker, browsers) we keep static values for now.
    })();

    return () => { cancelled = true; };
  }, [program.name]);

  return meta;
};

const programs = [
  {
    name: 'Malwarebytes',
    description: 'Skuteczne narzędzie do usuwania złośliwego oprogramowania, spyware i adware.',
    version: '5.1.5',
    size: '298 MB',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.malwarebytes.com/mwb-download',
    category: 'Bezpieczeństwo',
    screenshot: 'https://www.malwarebytes.com/blog/content/images/size/w1200/2023/08/MB5-UI.jpg',
  },
  {
    name: 'CCleaner',
    description: 'Popularne narzędzie do czyszczenia systemu z niepotrzebnych plików i optymalizacji.',
    version: '6.26',
    size: '79 MB',
    platform: 'Windows/macOS',
    platformIcon: Windows,
    url: 'https://www.ccleaner.com/ccleaner/download',
    category: 'System',
    screenshot: 'https://download.ccleaner.com/press/ccleaner/windows/ccleaner-professional-screenshot.png',
  },
  {
    name: 'Visual Studio Code',
    description: 'Wszechstronny edytor kodu z ogromną liczbą rozszerzeń i wbudowanym wsparciem dla Git.',
    version: '1.91',
    size: '100 MB',
    platform: 'Windows/macOS/Linux',
    platformIcon: Code,
    url: 'https://code.visualstudio.com/download',
    category: 'Deweloperskie',
    screenshot: 'https://code.visualstudio.com/assets/home/home-screenshot-mac-2x.png',
  },
  {
    name: 'CrystalDiskInfo',
    description: 'Monitoruje stan dysków twardych (HDD/SSD) i wyświetla szczegółowe informacje S.M.A.R.T.',
    version: '9.3.1',
    size: '6.5 MB',
    platform: 'Windows',
    platformIcon: HardDrive,
    url: 'https://crystalmark.info/en/download/#CrystalDiskInfo',
    category: 'Dyski',
    screenshot: 'https://crystalmark.info/wp/wp-content/uploads/CrystalDiskInfo_8_apple.png',
  },
  {
    name: '7-Zip',
    description: 'Darmowy archiwizer plików o wysokim stopniu kompresji, obsługujący wiele formatów.',
    version: '24.07',
    size: '1.5 MB',
    platform: 'Windows',
    platformIcon: Settings,
    url: 'https://www.7-zip.org/download.html',
    category: 'Archiwizacja',
    screenshot: 'https://www.7-zip.org/7ziplogo.png',
  },
  {
    name: 'AnyDesk',
    description: 'Szybkie i bezpieczne oprogramowanie do zdalnego pulpitu dla profesjonalistów IT.',
    version: '8.0.10',
    size: '5 MB',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://anydesk.com/pl/downloads',
    category: 'Zdalny dostęp',
    screenshot: 'https://anydesk.com/_next/image?url=%2Fimages%2Fv16%2Fscreens%2Fwin_en.webp&w=1920&q=75',
  },
  {
    name: 'Bitdefender Free',
    description: 'Lekki, skuteczny antywirus do ochrony w czasie rzeczywistym.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.bitdefender.com/solutions/free.html',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'Avast Free Antivirus',
    description: 'Darmowy antywirus z ochroną WWW, maila i w czasie rzeczywistym.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.avast.com/free-antivirus-download',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'Kaspersky Free',
    description: 'Darmowy antywirus z wysoką wykrywalnością i ochroną w czasie rzeczywistym.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.kaspersky.pl/free-antivirus',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'ClamAV',
    description: 'Otwarty silnik antywirusowy do skanowania plików na wielu platformach.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.clamav.net/downloads',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'Spybot Search & Destroy',
    description: 'Wykrywanie i usuwanie spyware oraz niechcianych komponentów.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.safer-networking.org/download/',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'AdwCleaner',
    description: 'Szybkie usuwanie adware, toolbarów i PUP (od Malwarebytes).',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.malwarebytes.com/adwcleaner',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'KeePassXC',
    description: 'Otwarty menedżer haseł offline – lokalne bazy i silne szyfrowanie.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://keepassxc.org/download/',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'VeraCrypt',
    description: 'Szyfrowanie dysków i kontenerów – następca TrueCrypt.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.veracrypt.fr/en/Downloads.html',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'NordVPN',
    description: 'Popularny VPN z dużą siecią serwerów i wysoką przepustowością.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://nordvpn.com/download/',
    category: 'Bezpieczeństwo',
  },
  {
    name: 'HWMonitor',
    description: 'Odczyt temperatur, napięć i prędkości wentylatorów.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.cpuid.com/softwares/hwmonitor.html',
    category: 'System',
  },
  {
    name: 'CPU-Z',
    description: 'Szczegółowe informacje o procesorze, pamięci i płycie głównej.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.cpuid.com/softwares/cpu-z.html',
    category: 'System',
  },
  {
    name: 'GPU-Z',
    description: 'Dane i monitoring karty graficznej.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.techpowerup.com/gpuz/',
    category: 'System',
  },
  {
    name: 'Speccy',
    description: 'Szczegółowe informacje o podzespołach komputera.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.ccleaner.com/speccy',
    category: 'System',
  },
  {
    name: 'Rufus',
    description: 'Tworzenie bootowalnych pendrive’ów.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://rufus.ie/',
    category: 'System',
  },
  {
    name: 'Balena Etcher',
    description: 'Proste nagrywanie obrazów ISO na USB/SD.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://etcher.balena.io/',
    category: 'System',
  },
  {
    name: 'WinDirStat',
    description: 'Wizualizacja zajętości dysku i analiza plików.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://windirstat.net/',
    category: 'Optymalizacja',
  },
  {
    name: 'Stacer',
    description: 'Optymalizacja i monitor zasobów dla Linuksa.',
    version: '—',
    size: '—',
    platform: 'Linux',
    platformIcon: Code,
    url: 'https://github.com/oguzhaninan/Stacer',
    category: 'Optymalizacja',
  },
  // Programowanie / IT
  {
    name: 'Sublime Text',
    description: 'Lekki i szybki edytor kodu.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.sublimetext.com/download',
    category: 'Deweloperskie',
  },
  {
    name: 'Notepad++',
    description: 'Klasyczny i rozbudowany edytor tekstu/kodu dla Windows.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://notepad-plus-plus.org/downloads/',
    category: 'Deweloperskie',
  },
  {
    name: 'Atom',
    description: 'Edytor kodu open source (projekt wygaszony, archiwalny).',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://github.com/atom/atom',
    category: 'Deweloperskie',
  },
  {
    name: 'IntelliJ IDEA CE',
    description: 'Darmowa edycja IDE dla Javy od JetBrains.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.jetbrains.com/idea/download/',
    category: 'Deweloperskie',
  },
  {
    name: 'PyCharm CE',
    description: 'Darmowe IDE dla Pythona od JetBrains.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.jetbrains.com/pycharm/download/',
    category: 'Deweloperskie',
  },
  {
    name: 'Arduino IDE',
    description: 'Środowisko do programowania mikrokontrolerów Arduino.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.arduino.cc/en/software',
    category: 'Deweloperskie',
  },
  {
    name: 'Postman',
    description: 'Narzędzie do testowania API i automatyzacji requestów.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.postman.com/downloads/',
    category: 'Deweloperskie',
  },
  {
    name: 'GitHub Desktop',
    description: 'Graficzny klient Git od GitHub.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS',
    platformIcon: MonitorSmartphone,
    url: 'https://desktop.github.com/',
    category: 'Deweloperskie',
  },
  {
    name: 'Docker Desktop',
    description: 'Lokalne środowisko kontenerowe Docker.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.docker.com/products/docker-desktop/',
    category: 'Deweloperskie',
  },
  // Internet / Sieć
  {
    name: 'Firefox',
    description: 'Przeglądarka internetowa open-source od Mozilla.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.mozilla.org/firefox/new/',
    category: 'Internet / Sieć',
  },
  {
    name: 'Brave',
    description: 'Przeglądarka z wbudowaną ochroną prywatności i adblockiem.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://brave.com/download/',
    category: 'Internet / Sieć',
  },
  {
    name: 'Tor Browser',
    description: 'Anonimowe przeglądanie z wykorzystaniem sieci Tor.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.torproject.org/download/',
    category: 'Internet / Sieć',
  },
  {
    name: 'FileZilla',
    description: 'Popularny klient FTP/SFTP.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://filezilla-project.org/download.php',
    category: 'Internet / Sieć',
  },
  {
    name: 'PuTTY',
    description: 'Lekki klient SSH/Telnet dla Windows.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.putty.org/',
    category: 'Internet / Sieć',
  },
  {
    name: 'MobaXterm',
    description: 'Terminal dla Windows z X11, SSH i narzędziami sieciowymi.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://mobaxterm.mobatek.net/download-home-edition.html',
    category: 'Internet / Sieć',
  },
  {
    name: 'Wireshark',
    description: 'Analizator ruchu sieciowego (sniffer).',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.wireshark.org/download.html',
    category: 'Internet / Sieć',
  },
  {
    name: 'Fing',
    description: 'Skaner sieciowy i diagnostyka połączeń.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS',
    platformIcon: MonitorSmartphone,
    url: 'https://www.fing.com/download',
    category: 'Internet / Sieć',
  },
  {
    name: 'Angry IP Scanner',
    description: 'Szybki skaner adresów IP i portów.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://angryip.org/download/',
    category: 'Internet / Sieć',
  },
  // Multimedia / Grafika
  {
    name: 'VLC Media Player',
    description: 'Wszechstronny odtwarzacz multimediów.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.videolan.org/vlc/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'Audacity',
    description: 'Darmowy edytor audio.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.audacityteam.org/download/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'OBS Studio',
    description: 'Nagrywanie i streamowanie wideo.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://obsproject.com/download',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'GIMP',
    description: 'Edytor grafiki rastrowej.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.gimp.org/downloads/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'Inkscape',
    description: 'Grafika wektorowa (SVG).',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://inkscape.org/release/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'Shotcut',
    description: 'Nieliniowa edycja wideo.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://shotcut.org/download/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'HandBrake',
    description: 'Konwerter wideo i ripper DVD/Blu-ray.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://handbrake.fr/downloads.php',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'Blender',
    description: 'Modelowanie i animacja 3D.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.blender.org/download/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'Paint.NET',
    description: 'Prosty edytor obrazów dla Windows.',
    version: '—',
    size: '—',
    platform: 'Windows',
    platformIcon: Windows,
    url: 'https://www.getpaint.net/',
    category: 'Multimedia / Grafika',
  },
  {
    name: 'Darktable',
    description: 'Edycja i wywoływanie zdjęć RAW.',
    version: '—',
    size: '—',
    platform: 'Windows/macOS/Linux',
    platformIcon: MonitorSmartphone,
    url: 'https://www.darktable.org/install/',
    category: 'Multimedia / Grafika',
  },
];

const ProgramCard = ({ program, onCopy }) => {
  const meta = useAutoMeta(program);
  const iconUrl = vendorIcon(program.url);
  return (
    <Card className="bg-card/80 border-primary/20 backdrop-blur-sm flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-6 h-6 rounded" loading="lazy" />
          ) : (
            <program.platformIcon className="w-6 h-6 text-primary" />
          )}
          <span className="flex items-center gap-2">
            {program.name}
            <Badge variant="outline" className="bg-background/60 text-xs">{program.category}</Badge>
          </span>
        </CardTitle>
        <CardDescription>
          <Tooltip
            content={
              <div className="max-w-[320px]">
                <div className="mb-2 font-semibold">Szybki podgląd — {program.name}</div>
                {program.screenshot ? (
                  <img src={program.screenshot} alt={`Podgląd ${program.name}`} className="w-full h-auto rounded border border-border/60 mb-2" loading="lazy" />
                ) : null}
                <p className="text-xs text-muted-foreground">{program.description}</p>
              </div>
            }
            side="top"
            align="start"
          >
            <span className="underline underline-offset-2 decoration-dotted cursor-help">Najedź, aby podejrzeć</span>
          </Tooltip>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end">
        <div className="text-xs text-muted-foreground space-y-1 mb-4 font-mono">
          <p>Wersja: {meta.version || program.version}</p>
          <p>Rozmiar: {meta.size || program.size || '—'}</p>
          <p>Platforma: {program.platform}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="w-full">
            <a 
              href={program.url} 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label={`Pobierz ${program.name} ze strony producenta`}
            >
              <Download className="mr-2 h-4 w-4" />
              Pobierz
            </a>
          </Button>
          <Tooltip content="Kopiuj link">
            <Button variant="ghost" size="icon" aria-label={`Kopiuj link do ${program.name}`} onClick={() => onCopy(program.url)}>
              <span role="img" aria-hidden>📋</span>
            </Button>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};

const LabDownloads = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Wszystkie');
  const [platform, setPlatform] = useState('Wszystkie');

  const categories = useMemo(() => ['Wszystkie', ...Array.from(new Set(programs.map(p => p.category)))], []);
  const platforms = useMemo(() => {
    const tokens = new Set();
    programs.forEach(p => p.platform.split('/').map(s => s.trim()).forEach(tok => tokens.add(tok)));
    return ['Wszystkie', ...Array.from(tokens)];
  }, []);

  const filtered = programs.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category === 'Wszystkie' || p.category === category;
    const matchesPlat = platform === 'Wszystkie' || p.platform.split('/').map(s=>s.trim()).includes(platform);
    return matchesQuery && matchesCat && matchesPlat;
  });

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Skopiowano', description: 'Adres pobrania skopiowany do schowka.' });
    } catch (e) {
      toast({ title: 'Błąd', description: 'Nie udało się skopiować linku.', variant: 'destructive' });
    }
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Downloads - Lab - ByteClinic</title>
        <meta name="description" content="Pobierz sprawdzone i polecane narzędzia diagnostyczne, systemowe i deweloperskie bezpośrednio ze stron producentów." />
      </Helmet>
      <SectionTitle subtitle="Sprawdzone i polecane narzędzia">Downloads</SectionTitle>

      {/* Filtry i wyszukiwarka */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3" role="group" aria-label="Filtry pobierania">
        <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Szukaj narzędzi..." aria-label="Szukaj" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Kategoria"><SelectValue placeholder="Kategoria" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger aria-label="Platforma"><SelectValue placeholder="Platforma" /></SelectTrigger>
          <SelectContent>
            {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <section id="download" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scroll-mt-28">
        {filtered.map((program) => (
          <ProgramCard key={program.name} program={program} onCopy={copy} />
        ))}
      </section>
      <p className="text-center text-muted-foreground text-sm mt-8">
        Pobierasz oprogramowanie bezpośrednio ze strony producenta.
      </p>
    </PageTransition>
  );
};

export default LabDownloads;
