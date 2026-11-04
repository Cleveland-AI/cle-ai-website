import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { BlogIndex } from "@/components/posts/PostArchive";

export const metadata: Metadata = buildMetadata({ title: "Blog", path: "/blog" });
export const ensureStatic = "navigation";

export default function BlogPage() {
  return <BlogIndex page={1} />;
}
