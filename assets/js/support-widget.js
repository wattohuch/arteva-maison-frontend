/**
 * ARTÉVA Maison - Live Web Chat Widget (Tawk.to)
 * Replaces the WhatsApp support widget to completely hide phone numbers.
 */
(function () {
  'use strict';
  
  // =========================================================================
  // ⚠️ ACTION REQUIRED: 
  // 1. Go to https://www.tawk.to/ and sign up for a free account.
  // 2. Create a "Property" for ARTEVA Maison.
  // 3. Find your "Property ID" in the dashboard (Administration > Chat Widget).
  // 4. Paste it below to activate the live chat!
  // =========================================================================
  
  const TAWKTO_PROPERTY_ID = 'ENTER_YOUR_ID_HERE'; 

  // Don't load if ID isn't set yet
  if (TAWKTO_PROPERTY_ID === 'ENTER_YOUR_ID_HERE') {
      console.warn('Live Chat Widget disabled: Please enter your Tawk.to Property ID in assets/js/support-widget.js');
      return;
  }

  // Tawk.to Installation Script
  var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
  var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
  s1.async=true;
  s1.src='https://embed.tawk.to/' + TAWKTO_PROPERTY_ID + '/default';
  s1.charset='UTF-8';
  s1.setAttribute('crossorigin','*');
  s0.parentNode.insertBefore(s1,s0);

})();
