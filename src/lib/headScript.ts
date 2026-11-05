/**
 * Runs before first paint (functions.php wp_head, priority 1): html.cle-js tells CSS that scripts run
 * (the story stage needs it), and html.cle-logo-seen skips the logo's drop-in after the first page of a
 * visit. The logo sets the sessionStorage flag (blocks/logo/LogoMark.client.tsx).
 */
export const HEAD_SCRIPT =
  "(function(d){d.classList.add('cle-js');try{if(sessionStorage.getItem('cle-logo-seen'))d.classList.add('cle-logo-seen')}catch(e){}})(document.documentElement);";
