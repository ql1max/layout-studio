import './index.css';

const TITLE = 'Product Sheet Creator';
const DESCRIPTION = 'A print-aware document builder for product one-pagers. Millimeter-accurate A4 and Letter pages rendered in the browser, with swappable templates, theme tokens, and print-ready PDF export.';
const GITHUB_REPO = 'ql1max/product-sheet-creator';

export default function App() {
  const stack = ['Vite', 'React', 'TypeScript', 'Cloudflare Workers'];

  return (
    <div className="app">
      <header className="header">
        <h1>{TITLE}</h1>
        <p className="subtitle">{DESCRIPTION}</p>
      </header>

      <main className="main">
        <section className="card" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading">Purpose</h2>
          <p>A Vite + React + TypeScript starter deployed to Cloudflare Workers Static Assets. Use this as a template for new Labs experiments.</p>
        </section>

        <section className="card" aria-labelledby="stack-heading">
          <h2 id="stack-heading">Stack</h2>
          <ul className="tag-list">
            {stack.map((tech) => (
              <li key={tech} className="tag">{tech}</li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="deployment-heading">
          <h2 id="deployment-heading">Deployment</h2>
          <p>Deployed to Cloudflare Workers Static Assets. Run <code>npm run deploy</code> to build and publish.</p>
        </section>

        {Boolean(GITHUB_REPO) && (
          <section className="card" aria-labelledby="source-heading">
            <h2 id="source-heading">Source Code</h2>
            <a href={`https://github.com/${GITHUB_REPO}`} className="link" target="_blank" rel="noopener noreferrer">
              View on GitHub →
            </a>
          </section>
        )}

        <section className="card" aria-labelledby="next-steps-heading">
          <h2 id="next-steps-heading">Next Steps</h2>
          <ul>
            <li>Replace this content with your experiment.</li>
            <li>Update README.md with project-specific details.</li>
            <li>Deploy and register in the portfolio Labs section.</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>Labs Experiment · Vite + React + Workers</p>
      </footer>
    </div>
  );
}
