import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { Suspense, type ReactNode } from "react";
import { blockComponents } from "@/blocks/registry";
import { Buttons } from "@/components/core/Buttons";
import { Column, Columns } from "@/components/core/Columns";
import { Figure } from "@/components/core/Figure";
import { Image as ImageBlock } from "@/components/core/Image";
import { QueryList } from "@/components/core/QueryList";
import { RawHtml } from "@/components/core/RawHtml";
import { Section, parseStyle } from "@/components/core/Section";
import { Separator } from "@/components/core/Separator";
import { Spacer } from "@/components/core/Spacer";
import { Table } from "@/components/core/Table";
import { Quote } from "@/components/core/Quote";
import { LIST_STYLES, TEXT_STYLES } from "@/components/core/textStyles";
import { texturizeSpans } from "@/components/core/texturize";
import type { RichBody as RichBodyValue } from "@/lib/content/types";

const warned = new Set<string>();
function warnOnce(type: string) {
  if (warned.has(type)) return;
  warned.add(type);
  console.warn(`RichBody: no renderer for block type "${type}"; skipping it.`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- block values are typed per component
type AnyValue = any;

const nested = (children: unknown): ReactNode =>
  Array.isArray(children) && children.length ? <RichBody value={children as RichBodyValue} /> : null;

// A registered block whose value has a `children` array (cle/world, cle/story, cle/hotspot-scene...)
// would look like a text block to Portable Text, so every registered type is also listed in `types`.
// Built on first render, not at import: the registry imports blocks that import RichBody.
const registered = (): PortableTextComponents["types"] =>
  Object.fromEntries(
    Object.entries(blockComponents).map(([type, Registered]) => [type, ({ value }: AnyValue) => <Registered {...(value as object)} />]),
  );

let built: PortableTextComponents | undefined;
const getComponents = (): PortableTextComponents => (built ??= { ...components, types: { ...registered(), ...components.types } });

const components: PortableTextComponents = {
  types: {
    section: ({ value }: AnyValue) => <Section value={value}>{nested(value.children)}</Section>,
    columns: ({ value }: AnyValue) => (
      <Columns value={value}>
        {(value.columns ?? []).map((c: AnyValue) => (
          <Column key={c._key} value={c}>
            {nested(c.children)}
          </Column>
        ))}
      </Columns>
    ),
    buttons: ({ value }: AnyValue) => <Buttons value={value} />,
    figure: ({ value }: AnyValue) => <Figure value={value} />,
    image: ({ value }: AnyValue) => <ImageBlock value={value} />,
    table: ({ value }: AnyValue) => <Table value={value} />,
    quote: ({ value }: AnyValue) => <Quote value={value} />,
    separator: ({ value }: AnyValue) => <Separator value={value} />,
    spacer: ({ value }: AnyValue) => <Spacer value={value} />,
    rawHtml: ({ value }: AnyValue) => <RawHtml value={value} />,
    queryList: ({ value }: AnyValue) => (
      <Suspense fallback={null}>
        <QueryList source={value.source} when={value.when} count={value.count} />
      </Suspense>
    ),
  },
  block: Object.fromEntries(
    Object.entries(TEXT_STYLES).map(([name, { tag: Tag, className, style }]) => [
      name,
      ({ children }: { children?: ReactNode }) => (
        <Tag className={className} style={parseStyle(style)}>
          {children}
        </Tag>
      ),
    ]),
  ),
  list: Object.fromEntries(
    Object.entries(LIST_STYLES).map(([name, { tag: Tag, className }]) => [
      name,
      ({ children }: { children?: ReactNode }) => <Tag className={className}>{children}</Tag>,
    ]),
  ),
  marks: {
    link: ({ value, children }) => (
      <a href={value?.href} {...(value?.blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    ),
  },
  unknownType: ({ value }) => {
    const type = String((value as { _type?: string })?._type);
    const Registered = blockComponents[type];
    if (Registered) return <Registered {...(value as object)} />;
    warnOnce(type);
    return null;
  },
};

/** Renders a richBody Portable Text array with WordPress's class names. Unknown block types render nothing. */
/** Text blocks with WordPress's smart quotes and dashes, applied at render time (R12). */
const texturized = (value: RichBodyValue) =>
  value.map((item) =>
    item._type === "block" && Array.isArray(item.children) ? { ...item, children: texturizeSpans(item.children) } : item,
  );

export function RichBody({ value }: { value?: RichBodyValue | null }) {
  if (!value?.length) return null;
  return <PortableText value={texturized(value) as never} components={getComponents()} onMissingComponent={false} />;
}
