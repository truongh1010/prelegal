import { notFound } from "next/navigation";
import { getTemplateDefinition, readTemplateContent } from "@/lib/templates/catalog";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { TemplateCreator } from "@/components/TemplateCreator";

export function generateStaticParams() {
  return TEMPLATE_REGISTRY.map((template) => ({ slug: template.slug }));
}

export default async function CreateTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplateDefinition(slug);
  if (!template) notFound();

  const rawContent = readTemplateContent(template.filename);

  return <TemplateCreator template={template} rawContent={rawContent} />;
}
