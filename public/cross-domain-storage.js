/**
 * INAKTIVERAD: Tidigare cross-domain storage
 * 
 * Denna fil har inaktiverats eftersom vi nu använder cookie-baserad autentisering
 * via Supabase, som hanterar sessioner på ett mer pålitligt sätt.
 */
(function() {
  console.log('Cross-domain storage är inaktiverad - använder cookies för autentisering');
  
  // Definiera tomma/dummy-funktioner för bakåtkompatibilitet
  window.safeStorage = {
    getItem: function() { return null; },
    setItem: function() { return true; },
    removeItem: function() { return true; }
  };
  
  window.supabaseStorage = {
    getSession: function() { return null; },
    setSession: function() { return true; },
    clearSession: function() { 
      console.log('supabaseStorage.clearSession anropad men gör ingenting - använder cookies istället');
      return true; 
    }
  };
  
  window.__crossDomainStorageInitialized = true;
})(); 