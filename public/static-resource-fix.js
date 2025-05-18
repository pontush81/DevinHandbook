/**
 * Ultra-enkelt redirect script för subdomäner
 */
(function() {
  // Baserat på domänen: omdirigera från alla subdomäner till huvuddomänen
  const currentDomain = window.location.hostname;
  
  // Om vi är på en subdomän av handbok.org
  if (currentDomain.endsWith('.handbok.org') && 
       currentDomain !== 'www.handbok.org' && 
       currentDomain !== 'handbok.org') {
    
    const subdomain = currentDomain.split('.')[0];
    window.location.href = 'https://handbok.org/handbook/' + subdomain;
  }
})(); 