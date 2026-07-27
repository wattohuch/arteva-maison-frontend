import { useParams, Navigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { legalContent } from '../data/legalContent';
import './LegalPage.css';

/**
 * One component for every policy page.
 *
 * The documents differ only in their words, so four near-identical page
 * components would be four places to keep a layout change in step. The content
 * lives in data/legalContent.js in both languages; this renders it.
 */
export default function LegalPage({ slug: slugProp }) {
  const params = useParams();
  const { lang } = useI18n();
  const slug = slugProp || params.slug;

  const doc = legalContent[slug]?.[lang] || legalContent[slug]?.en;
  if (!doc) return <Navigate to="/" replace />;

  return (
    <div className="section">
      <article className="container legal-page">
        <header className="legal-head">
          <h1>{doc.title}</h1>
          <p className="legal-updated">{doc.updated}</p>
        </header>

        {doc.sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>

            {section.body?.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}

            {section.list && (
              <ul>
                {section.list.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
