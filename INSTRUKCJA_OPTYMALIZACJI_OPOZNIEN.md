# ⚡ Instrukcja optymalizacji opóźnień powiadomień email

**Cel:** Skrócenie opóźnień z ~3 minut do ~1-2 minut

---

## 🎯 **Rozwiązanie: Monitor co 1 minutę**

### **Opcja 1: Pętla nieskończona (zalecana dla testów)**

```bash
# Uruchom w terminalu:
while true; do
  bash monitor-powiadomien.sh
  sleep 60  # Czekaj 1 minutę
done
```

**Uwaga:** Zostaw terminal otwarty, Ctrl+C żeby zatrzymać

---

### **Opcja 2: Systemowy cron (zalecana dla produkcji)**

#### **Krok 1: Dodaj do crontab**
```bash
# Otwórz crontab:
crontab -e

# Dodaj linię (uruchamiaj co minutę):
* * * * * /bin/bash /ścieżka/do/monitor-powiadomien.sh >> /var/log/powiadomienia.log 2>&1
```

#### **Krok 2: Ustaw prawa wykonania**
```bash
chmod +x monitor-powiadomien.sh
```

#### **Krok 3: Sprawdź status**
```bash
# Lista aktywnych cron jobs:
crontab -l

# Sprawdź logi:
tail -f /var/log/powiadomienia.log
```

---

### **Opcja 3: Windows Task Scheduler**

#### **Stwórz zadanie:**
1. Otwórz **Task Scheduler**
2. **Create Basic Task**
3. Name: `Monitor Powiadomień ByteClinic`
4. **Trigger:** Daily, Start time: teraz
5. **Action:** Start a program
6. **Program:** `bash`
7. **Arguments:** `monitor-powiadomien.sh`
8. **Start in:** `c:/Users/pytla/OneDrive/Pulpit/bytev2/`

#### **Ustaw częstotliwość:**
- W zakładce **Triggers** → Edit
- **Repeat task every:** 1 minutes
- **Duration:** Indefinitely

---

## 📊 **Oczekiwane rezultaty:**

| Przed | Po optymalizacji |
|-------|------------------|
| **2-5 minut** | **1-2 minuty** |
| Monitor ręczny co 2-5 min | Automatycznie co 1 min |
| Opóźnienie ~3 min | Opóźnienie ~1 min |

---

## 🔧 **Monitoring wydajności**

### **Sprawdź czy monitor działa:**
```bash
# Sprawdź procesy bash:
ps aux | grep monitor-powiadomien

# Sprawdź logi w czasie rzeczywistym:
tail -f monitor-powiadomien.log
```

### **Test opóźnienia:**
1. Wyślij testowe zgłoszenie przez formularz
2. Sprawdź czas utworzenia w bazie:
   ```sql
   SELECT notification_id, created_at 
   FROM notifications 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
3. Sprawdź czas wysłania:
   ```sql
   SELECT notification_id, sent_at 
   FROM notifications 
   ORDER BY sent_at DESC 
   LIMIT 1;
   ```

---

## ⚠️ **Uwagi ważne:**

### **Zużycie zasobów:**
- **API calls:** ~1440 razy dziennie (co minutę)
- **Resend limit:** 100 emaili dziennie (Free tier)
- **Edge Function:** minimalne obciążenie

### **Ograniczenia Resend:**
- **Rate limit:** 2 żądania/sekundę ✅ (1/min = bezpieczne)
- **Dagłowy limit:** 100 emaili ⚠️ (monitor sprawdza tylko, nie wysyła)

### **Logi:**
- **Supabase Logs:** Edge Functions → process-pending-notifications
- **Local logs:** monitor-powiadomien.log (jeśli skonfigurowane)

---

## 🚀 **Długoterminowe rozwiązania:**

### **1. Database Webhooks** ($25/miesiąc)
- Opóźnienie: **sekundy**
- Real-time processing
- Bez monitora ręcznego

### **2. Supabase Scheduler**
- Oficjalnie wspierane
- Konfiguracja w Dashboard
- Automatyczne uruchamianie

### **3. Vercel Cron Jobs**
- Darmowe dla małych projektów
- Uruchamiaj process-pending-notifications
- Łatwa konfiguracja

---

## ✅ **Sprawdzenie sukcesu:**

Po wdrożeniu monitora co 1 minutę:

1. **Nowe powiadomienia** powinny mieć opóźnienie 1-2 minuty
2. **Brak kumulacji** pending notifications
3. **System działa stabilnie** bez błędów

**Status optymalizacji:** 🟢 **Gotowe do wdrożenia**