import type { MetadataRoute } from "next";
import { getCrawlerPolicy } from "@/lib/crawler-policy";
import { env } from "@/lib/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const policy = await getCrawlerPolicy();
  return {
    rules: policy.robotsTxtRules,
    sitemap: `${env.APP_URL.replace(/\/$/, "")}/sitemap.xml`,
  };
}
