export function LegalNotice({ className }: { className?: string }) {
  return (
    <p className={className}>
      Prelegal is not a law firm and this is not legal advice. Have a qualified lawyer review
      documents before you sign. Drafts are adapted from{" "}
      <a href="https://github.com/CommonPaper" className="underline">
        Common Paper
      </a>{" "}
      templates, filled in with your details, under{" "}
      <a href="https://creativecommons.org/licenses/by/4.0/" className="underline">
        CC BY 4.0
      </a>
      .
    </p>
  );
}
