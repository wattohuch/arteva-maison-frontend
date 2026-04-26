/**
 * ARTÉVA Maison - Floating Support Widget
 * Dark / Gold luxury theme with WhatsApp & Email support.
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────
  const WHATSAPP_NUMBER = '96555636321';
  const WHATSAPP_MESSAGE = 'Hello ARTÉVA Maison, I need assistance.';
  const SUPPORT_EMAIL = 'Artevamaison@gmail.com';
  const EMAIL_SUBJECT = 'Support Ticket - ARTÉVA Maison';

  // ── Build Widget HTML ──────────────────────────
  function createWidget() {
    const widget = document.createElement('div');
    widget.className = 'support-widget';
    widget.id = 'supportWidget';

    widget.innerHTML = `
      <!-- Floating Action Button -->
      <button class="support-widget__fab" id="supportFab" aria-label="Customer Support">
        <!-- Chat icon (default) -->
        <svg class="support-widget__icon-chat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="10" r="0.8" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none"/>
        </svg>
        <!-- Close icon (when open) -->
        <svg class="support-widget__icon-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Tooltip -->
      <div class="support-widget__tooltip" id="supportTooltip">Need help? We're here</div>

      <!-- Popup Panel -->
      <div class="support-widget__panel" id="supportPanel">
        <div class="support-widget__header">
          <p class="support-widget__header-title">ARTÉVA Maison</p>
          <p class="support-widget__header-subtitle">We typically reply within minutes</p>
        </div>
        <div class="support-widget__body">
          <!-- WhatsApp Button -->
          <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}"
             target="_blank" rel="noopener noreferrer"
             class="support-widget__action support-widget__action--whatsapp"
             id="supportWhatsApp">
            <div class="support-widget__action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div class="support-widget__action-text">
              <span class="support-widget__action-label">Contact us on WhatsApp</span>
              <span class="support-widget__action-desc">Chat with our support team</span>
            </div>
          </a>

          <!-- Email Ticket Button -->
          <a href="mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}"
             class="support-widget__action support-widget__action--email"
             id="supportEmail">
            <div class="support-widget__action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div class="support-widget__action-text">
              <span class="support-widget__action-label">Submit a Ticket</span>
              <span class="support-widget__action-desc">Email our support team</span>
            </div>
          </a>
        </div>
        <div class="support-widget__footer">
          <span>ARTÉVA Maison</span>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
  }

  // ── Toggle Logic ───────────────────────────────
  function initWidget() {
    createWidget();

    const widget = document.getElementById('supportWidget');
    const fab = document.getElementById('supportFab');

    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      widget.classList.toggle('is-open');
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!widget.contains(e.target) && widget.classList.contains('is-open')) {
        widget.classList.remove('is-open');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && widget.classList.contains('is-open')) {
        widget.classList.remove('is-open');
      }
    });
  }

  // ── Initialize when DOM is ready ───────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
