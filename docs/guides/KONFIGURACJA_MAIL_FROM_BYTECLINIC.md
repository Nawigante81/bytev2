# 📧 Konfiguracja MAIL_FROM: noreply@byteclinic.pl

**Cel:** Używać własnej domeny jako nadawcy emaili  
**Status:** ⚠️ Wymaga weryfikacji domeny w Resend

---

## 🎯 Co chcesz osiągnąć

Emaile będą wysyłane z: **noreply@byteclinic.pl** zamiast `onboarding@resend.dev`

**Korzyści:**
- ✅ Bardziej profesjonalny wygląd
- ✅ Lepsza dostarczalność (własna domena)
- ✅ Branding firmy w emailach

---

## ⚠️ WAŻNE: Weryfikacja domeny

Resend **NIE POZWOLI** wysyłać z `noreply@byteclinic.pl` jeśli domena nie jest zweryfikowana!

**Błąd bez weryfikacji:**
```
Resend API error: 403 - Domain not verified
```

---

## 🚀 Plan działania

### Krok 1️⃣: Zweryfikuj domenę byteclinic.pl w Resend

**A. Otwórz Resend Dashboard:**
https://resend.com/domains

**B. Dodaj domenę (jeśli jeszcze nie):**
1. Kliknij "Add Domain"
2. Wpisz: `byteclinic.pl`
3. Wybierz region (Europe dla Polski)

**C. Dodaj rekordy DNS:**

Resend pokaże Ci 3 rekordy do dodania w DNS (u dostawcy domeny):

1. **SPF (TXT):**
   ```
   Type: TXT
   Name: byteclinic.pl lub @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

2. **DKIM (TXT):**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [wartość z Resend Dashboard]
   ```

3. **DMARC (TXT):**
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@byteclinic.pl
   ```

**D. Poczekaj na weryfikację:**
- DNS propagacja: 5 minut - 48 godzin (zazwyczaj ~30 minut)
- Resend sprawdza rekordy automatycznie co kilka minut
- Status zmieni się na ✅ "Verified"

---

### Krok 2️⃣: Ustaw MAIL_FROM w Supabase Secrets

**TYLKO po weryfikacji domeny!**

**Przez CLI:**
```bash
supabase secrets set MAIL_FROM=noreply@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

**Przez Dashboard:**
1. https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions
2. W sekcji "Secrets" zaktualizuj:
   ```
   MAIL_FROM = noreply@byteclinic.pl
   ```
3. Zapisz

**Poczekaj 30 sekund na restart edge functions**

---

### Krok 3️⃣: Przetestuj wysyłkę

```bash
curl -X POST "https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/process-pending-notifications" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

**Sukces wygląda tak:**
```json
{
  "success": true,
  "sent": X,
  "failed": 0
}
```

**Sprawdź email w Resend Dashboard:**
- From: `noreply@byteclinic.pl` ✅

---

## 🔧 Co jeśli domena NIE jest zweryfikowana?

### Scenariusz A: Dopiero dodajesz domenę

**Tymczasowo użyj domyślnego nadawcy Resend:**
```bash
supabase secrets set MAIL_FROM=onboarding@resend.dev --project-ref wllxicmacmfzmqdnovhp
```

Emaile będą działać natychmiast, a gdy domain się zweryfikuje, zmień na `noreply@byteclinic.pl`.

---

### Scenariusz B: Dodałeś rekordy DNS, czekasz na weryfikację

**Sprawdź status weryfikacji:**
1. https://resend.com/domains
2. Znajdź `byteclinic.pl`
3. Status powinien być:
   - ⏳ "Pending" → Czekaj (5 min - 48h)
   - ✅ "Verified" → Gotowe, ustaw MAIL_FROM

**Przyspiesz weryfikację:**
- Użyj narzędzia: https://dnschecker.org
- Sprawdź czy rekordy są widoczne globalnie
- Jeśli widoczne → Resend zweryfikuje wkrótce

---

### Scenariusz C: Nie masz dostępu do DNS domeny

**Tymczasowe rozwiązanie:**
1. Użyj `onboarding@resend.dev`
2. Lub dodaj subdomenę: `mail.byteclinic.pl` (jeśli masz dostęp do subdomen)

---

## 📋 Checklist weryfikacji domeny

- [ ] Domena dodana w Resend Dashboard
- [ ] Rekord SPF dodany w DNS
- [ ] Rekord DKIM dodany w DNS
- [ ] Rekord DMARC dodany w DNS (opcjonalny, ale zalecany)
- [ ] Rekordy widoczne w dnschecker.org
- [ ] Status w Resend: "Verified" ✅
- [ ] MAIL_FROM ustawiony w Supabase Secrets
- [ ] Test wysyłki przeszedł pomyślnie

---

## 🎯 Końcowa konfiguracja secrets

**Kompletna lista secrets w Supabase:**

```bash
supabase secrets set RESEND_API_KEY=<RESEND_API_KEY> --project-ref wllxicmacmfzmqdnovhp
supabase secrets set MAIL_FROM=noreply@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
supabase secrets set ADMIN_EMAIL=serwis@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp
```

---

## 💡 Best practices

### 1. SPF Record
Zawsze dodaj SPF jeśli wysyłasz emaile:
```
v=spf1 include:_spf.resend.com ~all
```

### 2. DKIM Record
Obowiązkowy dla weryfikacji w Resend. Wartość pobierz z Dashboard.

### 3. DMARC Record (opcjonalny)
Poprawia dostarczalność i chroni przed spoofingiem:
```
v=DMARC1; p=none; rua=mailto:dmarc@byteclinic.pl
```

### 4. Reply-To (opcjonalnie w przyszłości)
Możesz dodać pole `reply_to` w emailach:
```typescript
reply_to: "kontakt@byteclinic.pl"
```

---

## 🔍 Troubleshooting

### Problem: "Domain not verified" po 24h

**Przyczyny:**
- Rekordy DNS niepoprawnie dodane
- TTL (Time To Live) za długi
- Propagacja DNS powolna

**Rozwiązanie:**
1. Sprawdź rekordy: https://dnschecker.org
2. Wpisz dokładnie jak w Resend Dashboard (case sensitive!)
3. Skontaktuj się z hostem domeny jeśli problem trwa >48h

---

### Problem: Emaile w spam mimo zweryfikowanej domeny

**Rozwiązanie:**
1. Dodaj DMARC record
2. Podgrzej domenę (wyślij małe ilości emaili przez kilka dni)
3. Sprawdź content emaili (unikaj spam words)

---

## 📊 Porównanie

| Nadawca | Zalety | Wady |
|---------|--------|------|
| `onboarding@resend.dev` | ✅ Działa natychmiast, Brak konfiguracji | ❌ Mniej profesjonalny, Ogólna domena |
| `noreply@byteclinic.pl` | ✅ Profesjonalny, Własny branding, Lepsza dostarczalność | ⚠️ Wymaga weryfikacji DNS (24-48h) |

---

## ✅ Po weryfikacji

Emaile będą wyglądać tak:

```
From: ByteClinic <noreply@byteclinic.pl>
To: klient@example.com
Subject: 🔧 Nowe zgłoszenie naprawcze

[treść emaila]
```

**Profesjonalnie i wiarygodnie!** ✨

---

**Status:** Zweryfikuj domenę w Resend → Ustaw MAIL_FROM → System gotowy!
