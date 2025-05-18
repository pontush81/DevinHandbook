/**
 * Static Resource Fix - Ultra-förenklad version
 */
(function() {
  // Kontrollera om vi är på en subdomän
  const currentDomain = window.location.hostname;
  const isSubdomain = currentDomain.split('.').length > 2 && 
                     currentDomain.endsWith('.handbok.org') &&
                     currentDomain !== 'www.handbok.org' &&
                     currentDomain !== 'handbok.org';
  
  // Om vi är på en subdomän, omdirigera till huvuddomänen med subdomännamnet som parameter
  if (isSubdomain) {
    const subdomain = currentDomain.split('.')[0];
    window.location.href = 'https://handbok.org/handbook/' + subdomain;
  }
})(); 