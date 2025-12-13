# 🚀 Jak uruchomić optymalizację opóźnień (1 minuta)

**Cel:** Skrócenie opóźnień email z ~3 minut do ~1-2 minut

---

## ⚡ **OPCJA 1: PowerShell (ZALECANA dla Windows 11)**

### **Krok 1:** Uruchom PowerShell jako Administrator
- Kliknij prawym przyciskiem na menu Start
- Wybierz "Windows PowerShell" (Admin) lub "Windows PowerShell" (bez uprawnień)

### **Krok 2:** Przejdź do folderu z projektem
```powershell
cd "C:\Users\pytla\OneDrive\Pulpit\bytev2"
```

### **Krok 3:** Uruchom optymalizację
```powershell
.\start-monitor-optimized.ps1
```

**Jeśli wystąpi błąd z polityką wykonywania:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-monitor-optimized.ps1
```

---

## 🖥️ **OPCJA 2: Batch file (PROSTY)**

### **Krok 1:** Kliknij dwukrotnie na plik
```
start-monitor-optimized.bat
```

### **Krok 2:** Postępuj zgodnie z instrukcjami na ekranie

---

## 💻 **OPCJA 3: Terminal Linux/Mac**

### **W terminalu:**
```bash
while true; do
  bash monitor-powiadomien.sh
  sleep 60  # 1 minuta
done
```

---

## 📊 **Weryfikacja działania:**

### **Sprawdź logi w czasie rzeczywistym:**
```powershell
# PowerShell
Get-Content monitor-powiadomien.log -Wait -Tail 10

# Windows Command
type monitor-powiadomien.log
```

### **Oczekiwany rezultat:**
```
[2025-12-10 19:39:38] 🔍 Monitor powiadomień - uruchomienie co minutę
[2025-12-10 19:39:38] ==============================================
[2025-12-10 19:39:39] 📊 Pending notifications: 0
[2025-12-10 19:39:39] ✅ Brak pending notifications
```

---

## ⏹️ **Zatrzymanie monitora:**

### **W terminalu/konsoli:**
**Ctrl + C**

### **W PowerShell:**
**Ctrl + C** lub zamknij okno

---

## 📈 **Sprawdzenie skuteczności:**

### **Test opóźnienia:**
1. **Wyślij test** przez formularz kontaktowy na stronie
2. **Sprawdź czasy** w bazie danych:
   ```bash
   node sprawdz-stan-powiadomien.js
   ```
3. **Porównaj** z poprzednimi wynikami

### **Oczekiwana poprawa:**
- **Przed:** ~3 minuty opóźnienia
- **Po optymalizacji:** ~1-2 minuty opóźnienia

---

## ✅ **Status:**

**🟢 Gotowe do uruchomienia**  
**⏱️ Czas konfiguracji:** < 1 minuta  
**📊 Oczekiwana poprawa:** 50% skrócenie opóźnień  
**🔄 Monitorowanie:** Automatyczne co 1 minuta