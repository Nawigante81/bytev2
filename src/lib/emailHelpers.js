/**
 * Helper funkcja do sprawdzania statusu wysyłki emaili
 * Używana przez Contact.jsx, Pricing.jsx i inne formularze
 */

/**
 * Sprawdza czy email został pomyślnie wysłany przez notify-system
 * @param {Response} notifyResponse - Response z fetch do notify-system
 * @returns {Promise<{success: boolean, warning: boolean, error?: string}>}
 */
export async function checkEmailDeliveryStatus(notifyResponse) {
  if (!notifyResponse.ok) {
    const errorText = await notifyResponse.text();
    console.error('Błąd wysyłania powiadomienia:', errorText);
    return {
      success: false,
      warning: true,
      error: errorText
    };
  }

  try {
    const notifyResult = await notifyResponse.json();
    
    // Sprawdź czy processor faktycznie wysłał emaile
    if (notifyResult.processor && notifyResult.processor.triggered) {
      if (!notifyResult.processor.ok) {
        console.error('Błąd procesora powiadomień:', notifyResult.processor.error);
        return {
          success: false,
          warning: true,
          error: notifyResult.processor.error
        };
      }
    }
    
    return {
      success: true,
      warning: false
    };
  } catch (parseError) {
    console.error('Błąd parsowania odpowiedzi notify-system:', parseError);
    return {
      success: false,
      warning: true,
      error: parseError.message
    };
  }
}

/**
 * Wyświetla odpowiedni toast na podstawie statusu wysyłki
 * @param {Function} toast - Funkcja toast z useToast()
 * @param {boolean} warning - Czy wystąpiło ostrzeżenie
 * @param {string} ticketId - ID zgłoszenia/rezerwacji
 * @param {string} estimatedTime - Szacowany czas odpowiedzi
 */
export function showEmailStatusToast(toast, warning, ticketId, estimatedTime = '1 dzień roboczy') {
  if (warning) {
    toast({
      title: "Zgłoszenie zapisane",
      description: `Twoje zgłoszenie ${ticketId} zostało zapisane w systemie. Email potwierdzający może być opóźniony. Skontaktujemy się z Tobą w ciągu ${estimatedTime}.`,
      variant: "default"
    });
  } else {
    toast({
      title: "Zgłoszenie wysłane!",
      description: `Twoje zgłoszenie ${ticketId} zostało przekazane do zespołu. Otrzymasz odpowiedź w ciągu ${estimatedTime}.`,
    });
  }
}
