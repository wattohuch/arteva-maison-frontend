import { useState, useRef, useEffect } from 'react';
import { AdminAPI } from '../../../api/admin';

export default function MarketingSection() {
  const [sending, setSending] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [result, setResult] = useState(null);
  const [diag, setDiag] = useState(null);
  const [checking, setChecking] = useState(false);
  const [meta, setMeta] = useState(null);
  const fileRef = useRef(null);

  /* Meta's own setup can only be checked from a signed-in admin session: the
     endpoint is guarded, and the token lives in localStorage and travels as an
     Authorization header, so opening the URL in a browser tab is always
     "no token". Reading it here is the only way to see it without devtools. */
  useEffect(() => {
    AdminAPI.getMetaStatus()
      .then(res => setMeta(res?.data || res))
      .catch(err => setMeta({ error: err?.message || 'Could not read Meta status' }));
  }, []);

  const checkDelivery = async () => {
    setChecking(true);
    setDiag(null);
    try {
      const res = await AdminAPI.getEmailDiagnostics();
      setDiag(res?.data || res);
    } catch (err) {
      setDiag({ error: err?.message || 'Could not reach Mailgun.' });
    } finally {
      setChecking(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    const form = e.target;

    try {
      const formData = new FormData();
      formData.append('subject', form.subject.value);
      formData.append('message', form.message.value);
      formData.append('recipientType', form.recipientType.value);

      const images = fileRef.current?.files;
      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images', images[i]);
        }
      }

      const res = await AdminAPI.sendEmailWithImages(formData);
      // The endpoint answers 202 the moment the campaign is accepted, not when
      // the last email lands — saying "sent" here was reporting a delivery
      // nobody had confirmed. Per-recipient results land in the server log and
      // on the admin socket as `email_campaign_complete`.
      setResult({
        ok: true,
        text: res?.message || 'Campaign queued. Emails are going out now.',
      });
      form.reset();
      setPreviews([]);
    } catch (err) {
      setResult({ ok: false, text: err?.message || 'Failed to queue the campaign.' });
    } finally {
      setSending(false);
    }
  };

  const metaRows = meta && !meta.error ? [
    {
      label: 'Meta Pixel + Conversions API',
      ok: meta.conversionsApi?.enabled,
      detail: meta.conversionsApi?.enabled
        ? `Pixel ${meta.conversionsApi.pixelId}${meta.conversionsApi.testMode ? ' · TEST MODE ON' : ''}`
        : 'Set META_PIXEL_ID and META_CAPI_ACCESS_TOKEN on the server',
      warn: meta.conversionsApi?.testMode,
    },
    {
      label: 'Catalogue feed',
      ok: (meta.catalogProducts || 0) > 0,
      detail: `${meta.catalogProducts || 0} products would publish`,
    },
    {
      label: 'WhatsApp Cloud API',
      ok: meta.whatsapp?.configured,
      detail: meta.whatsapp?.configured
        ? `Webhook ${meta.whatsapp.webhookVerifyTokenSet ? 'ready' : 'token missing'}`
          + `${meta.whatsapp.signatureCheckEnabled ? ' · signed' : ' · UNSIGNED'}`
        : 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID',
      warn: meta.whatsapp?.configured && !meta.whatsapp?.signatureCheckEnabled,
    },
    {
      label: 'Facebook Login',
      ok: meta.facebookLogin?.configured,
      detail: meta.facebookLogin?.configured
        ? 'App credentials present'
        : 'Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET',
    },
  ] : [];

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">Email Marketing</h2>

      {/* Meta setup, read from the server. The /api/meta/status endpoint is
          admin-guarded, so opening it in a browser tab always answers "no
          token" — this is the signed-in view of the same thing. */}
      {meta && (
        <div style={{ marginBottom: 24, padding: '14px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <strong style={{ fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Meta integration status
          </strong>

          {meta.error ? (
            <p style={{ marginTop: 8, fontSize: '0.84rem', color: '#991b1b' }}>{meta.error}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {metaRows.map(row => (
                <li key={row.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.84rem' }}>
                  <span aria-hidden="true">{row.ok ? (row.warn ? '⚠️' : '✅') : '⭕'}</span>
                  <span>
                    <strong>{row.label}</strong>
                    <span style={{ color: 'var(--text-muted)' }}> — {row.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Delivery is the thing that silently fails: a sandbox Mailgun domain
          accepts every send and only delivers to authorised addresses, so
          campaigns look successful and arrive nowhere. This asks Mailgun. */}
      <div style={{ marginBottom: 20 }}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={checkDelivery} disabled={checking}>
          {checking ? 'Checking…' : '🔍 Check email delivery'}
        </button>

        {diag && (
          <div style={{
            marginTop: 12, padding: '12px 14px', borderRadius: 8, fontSize: '0.82rem',
            background: '#f8fafc', border: '1px solid #e2e8f0', lineHeight: 1.6,
          }}>
            {diag.error ? (
              <span style={{ color: '#991b1b' }}>{diag.error}</span>
            ) : (
              <>
                <div><strong>Domain:</strong> {diag.domain} {diag.state ? `(${diag.state})` : ''}</div>
                {diag.isSandbox && (
                  <div style={{ color: '#991b1b', marginTop: 6 }}>
                    <strong>This is a Mailgun sandbox domain.</strong> It can only deliver to
                    addresses you have explicitly authorised in Mailgun — campaigns to real
                    customers are accepted and then dropped. Verify a real domain in Mailgun
                    (add its DNS records) to send to anyone.
                  </div>
                )}
                {!diag.isSandbox && diag.verified === false && (
                  <div style={{ color: '#991b1b', marginTop: 6 }}>
                    Domain is <strong>not verified</strong> — its DNS records are incomplete,
                    so Mailgun will not deliver.
                  </div>
                )}
                {diag.rejected?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Recent failures:</strong>
                    <ul style={{ margin: '4px 0 0 18px' }}>
                      {diag.rejected.slice(0, 5).map((e, i) => (
                        <li key={i}>{e.recipient} — {e.reason || e.event}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diag.rejected?.length === 0 && diag.recentEvents?.length > 0 && (
                  <div style={{ color: '#166534', marginTop: 6 }}>
                    No rejections in the last {diag.recentEvents.length} events.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="admin-form" style={{ maxWidth: 700 }}>
        <label className="admin-form-label">
          Recipient Group
          <select name="recipientType" className="field-input" defaultValue="all">
            <option value="all">All Users</option>
            <option value="customers">Customers Only</option>
            <option value="admins">Admins Only</option>
          </select>
        </label>

        <label className="admin-form-label" style={{ marginTop: 16 }}>
          Subject *
          <input name="subject" className="field-input" required placeholder="Email subject line" />
        </label>

        <label className="admin-form-label" style={{ marginTop: 16 }}>
          Message *
          <textarea name="message" className="field-input" rows={6} required placeholder="Write your email content here..." />
        </label>

        <label className="admin-form-label" style={{ marginTop: 16 }}>
          Attach Images
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="admin-file"
            onChange={handleImageChange}
          />
        </label>

        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {previews.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--border-light)' }} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn--primary" disabled={sending}>
            {sending ? 'Sending...' : '📧 Send Campaign'}
          </button>
        </div>

        {result && (
          <p style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: '0.86rem',
            background: result.ok ? '#ecfdf5' : '#fef2f2',
            color: result.ok ? '#166534' : '#991b1b',
            border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {result.text}
          </p>
        )}
      </form>
    </div>
  );
}
