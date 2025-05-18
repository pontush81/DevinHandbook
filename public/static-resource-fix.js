/**
 * Ultra-enkelt redirect script för subdomäner
 */
(function() {
  // Baserat på domänen: omdirigera från alla subdomäner till huvuddomänen
  const currentDomain = window.location.hostname;
  
  // Bestäm om vi är i staging eller produktion
  const isStaging = currentDomain.includes('staging.handbok.org') || 
                    currentDomain.endsWith('.staging.handbok.org');
  
  // Om vi är på en subdomän av handbok.org
  if (currentDomain.endsWith('.handbok.org') && 
       currentDomain !== 'www.handbok.org' && 
       currentDomain !== 'handbok.org' &&
       currentDomain !== 'staging.handbok.org') {
    
    const subdomain = currentDomain.split('.')[0];
    
    // Välj rätt måldomän baserat på miljö
    const targetDomain = isStaging ? 'https://staging.handbok.org' : 'https://www.handbok.org';
    
    // För alla subdomäner - gå till handboken
    window.location.href = targetDomain + '/handbook/' + subdomain;
  }
})(); 