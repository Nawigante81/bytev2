// Test poprawki błędu StatusIcon w RepairTracker.jsx

console.log('🧪 Testowanie poprawki błędu StatusIcon w RepairTracker...\n');

try {
  // Sprawdź czy plik RepairTracker.jsx zawiera poprawkę
  const fs = require('fs');
  const filePath = 'src/components/RepairTracker.jsx';
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Sprawdź czy błąd został naprawiony
    const hasError = content.includes('<StatusIcon className="w-3 h-3 mr-1" />');
    const hasFix = content.includes('DialogStatusIcon');
    
    if (hasError && !hasFix) {
      console.error('❌ Błąd nadal występuje: StatusIcon nie został naprawiony');
    } else if (hasFix) {
      console.log('✅ Poprawka została zastosowana: DialogStatusIcon jest zdefiniowany');
      
      // Sprawdź czy poprawka jest prawidłowa
      const dialogStatusIconPattern = /DialogStatusIcon\s*=\s*statusConfig\[selectedRepair\.status\]\?\.icon\s*\|\|\s*Package;/;
      const hasCorrectFix = dialogStatusIconPattern.test(content);
      
      if (hasCorrectFix) {
        console.log('✅ Poprawka jest prawidłowa: DialogStatusIcon ma fallback na Package');
      } else {
        console.log('⚠️ Poprawka może być niepełna');
      }
    } else {
      console.log('ℹ️ Nie znaleziono błędu StatusIcon w kodzie');
    }
    
    // Sprawdź inne potencjalne problemy
    const lines = content.split('\n');
    let lineNumber = 0;
    let hasStatusIconUsage = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('StatusIcon') && !lines[i].includes('//')) {
        hasStatusIconUsage = true;
        lineNumber = i + 1;
        console.log(`⚠️ Znaleziono użycie StatusIcon w linii ${lineNumber}: ${lines[i].trim()}`);
      }
    }
    
    if (!hasStatusIconUsage) {
      console.log('✅ Nie znaleziono więcej problemów z StatusIcon');
    }
    
  } else {
    console.error('❌ Nie znaleziono pliku RepairTracker.jsx');
  }
  
} catch (error) {
  console.error('💥 Błąd podczas testu:', error.message);
}

console.log('\n📋 Instrukcje:');
console.log('1. Otwórz aplikację w przeglądarce: http://localhost:5173/');
console.log('2. Przejdź do sekcji "Status napraw"');
console.log('3. Sprawdź czy błąd "StatusIcon is not defined" został naprawiony');
console.log('4. Otwórz narzędzia deweloperskie (F12) i sprawdź console.log');