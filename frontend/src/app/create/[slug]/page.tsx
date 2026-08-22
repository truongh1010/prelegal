import { notFound } from "next/navigation";
import { getTemplateDefinition, readTemplateContent } from "@/lib/templates/catalog";
import { TemplateCreator } from "@/components/TemplateCreator";

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
