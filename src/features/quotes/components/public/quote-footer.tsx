import Image from 'next/image';
import type { QuoteCompany } from '../../types';

interface Props {
  company: QuoteCompany | null;
  companyName: string;
  code: string;
  createdAt: string | null;
}

function siteLabel(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const HTTP_URL = /^https?:\/\//i;

function CompanyLinks({ company }: { company: QuoteCompany }) {
  return (
    <nav className="qt-social" aria-label={`${company.name} na internet`}>
      <a href={`https://instagram.com/${encodeURIComponent(company.instagram)}`} target="_blank" rel="noopener noreferrer">
        Instagram
      </a>
      <a href={`https://facebook.com/${encodeURIComponent(company.facebook)}`} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      {HTTP_URL.test(company.site) && (
        <a href={company.site} target="_blank" rel="noopener noreferrer">
          {siteLabel(company.site)}
        </a>
      )}
    </nav>
  );
}

/** Rodapé com os dados reais da empresa (sem selos nem avaliações: não temos o dado). */
export function QuoteFooter({ company, companyName, code, createdAt }: Props) {
  return (
    <footer className="qt-footer qt-gutter">
      <Image src="/cotacao/logo-preto.png" alt={companyName} width={368} height={193} unoptimized />
      {company && <p className="qt-footer-tagline">{company.tagline}</p>}
      {company && <CompanyLinks company={company} />}
      {company && <p>Atendimento: {company.hours}</p>}
      <p>
        Cotação #{code}
        {createdAt ? ` · gerada em ${createdAt}` : ''}
      </p>
      {company && <p>CNPJ {company.cnpj}</p>}
    </footer>
  );
}
