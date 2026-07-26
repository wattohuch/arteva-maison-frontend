import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { showToast } from '../ui/Toast';
import './FacebookLoginButton.css';

/* ============================================
   ARTÉVA Maison — Sign in with Facebook

   Renders nothing unless VITE_FACEBOOK_APP_ID is set, so the button never
   appears on a build that has no app behind it.

   The SDK is loaded on first click rather than on page load: it is a
   third-party script on connect.facebook.net that most visitors will never
   use, and loading it up front would put it in the critical path of every
   single page for the few who do.
   ============================================ */

const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';
const SDK_ID = 'facebook-jssdk';

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB);

    window.fbAsyncInit = function () {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: false, version: 'v21.0' });
      resolve(window.FB);
    };

    if (document.getElementById(SDK_ID)) return undefined;

    const script = document.createElement('script');
    script.id = SDK_ID;
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Facebook SDK failed to load'));
    document.body.appendChild(script);
    return undefined;
  });
}

export default function FacebookLoginButton({ onSuccess }) {
  const { loginWithFacebook } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  // Nothing is fetched here — this only warms the connection so the SDK is a
  // little quicker to arrive if the visitor does reach for it.
  useEffect(() => {
    if (!APP_ID) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://connect.facebook.net';
    document.head.appendChild(link);
  }, []);

  const handleClick = useCallback(async () => {
    setBusy(true);
    try {
      const FB = await loadSdk();

      const authResponse = await new Promise((resolve) => {
        FB.login((response) => resolve(response.authResponse), {
          scope: 'public_profile,email',
        });
      });

      // Closing the popup is a decision, not a failure — say nothing.
      if (!authResponse?.accessToken) {
        setBusy(false);
        return;
      }

      const result = await loginWithFacebook(authResponse.accessToken);
      if (result?.success) {
        onSuccess?.(result);
      } else {
        showToast(result?.message || t('login_failed'), 'error');
      }
    } catch (err) {
      showToast(err.message || t('login_failed'), 'error');
    } finally {
      setBusy(false);
    }
  }, [loginWithFacebook, onSuccess, t]);

  if (!APP_ID) return null;

  return (
    <button
      type="button"
      className="fb-login-btn"
      onClick={handleClick}
      disabled={busy}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
        />
      </svg>
      {busy ? t('please_wait') : t('continue_with_facebook')}
    </button>
  );
}
