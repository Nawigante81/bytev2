# ⚡ Quick Start - Powiadomienia Email

## 🚀 Wdrożenie w 3 krokach

### 1. Wdróż funkcję
```bash
supabase functions deploy notify-new-diagnosis
```

### 2. Ustaw sekrety w panelu Supabase
**Edge Functions → notify-new-diagnosis → Secrets:**

```
RESEND_API_KEY=re_VsWYgLjD_BwtDXREEBVTk4U8UdQJCAzZa
MAIL_FROM=serwis@byteclinic.pl
ADMIN_EMAIL=admin@tech-majster.pro
```

### 3. Utwórz Webhook
**Database → Webhooks → Create hook:**

- **Name:** `notify-new-diagnosis`
- **Table:** `diagnosis_requests`  
- **Events:** ✓ Insert
- **Method:** POST
- **URL:** `https://[twoj-project].supabase.co/functions/v1/notify-new-diagnosis`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer [TWÓJ-ANON-KEY]
  ```

---

## ✅ Test

1. Wejdź na `/kontakt`
2. Wypełnij formularz
3. Wyślij zgłoszenie
4. Sprawdź email: **admin@tech-majster.pro**

---

## 📧 Przykładowy email

```
🔔 Nowe zgłoszenie #a1b2c3d4 - laptop

Data: 2024-01-15T14:30:00

👤 Klient
Imię i nazwisko: Jan Kowalski
Email: jan@example.com
Telefon: +48 123 456 789

💻 Urządzenie
laptop

📝 Opis problemu
Laptop nie włącza się, słychać pisk...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Panel administracyjny: https://byteclinic.pl/admin/tickets
```

---

## 🆘 Troubleshooting

**Email nie przychodzi?**

```bash
# Sprawdź logi
supabase functions logs notify-new-diagnosis

# Sprawdź sekrety
# Edge Functions → notify-new-diagnosis → Secrets

# Sprawdź SPAM
```

**Gotowe!** 🎉
