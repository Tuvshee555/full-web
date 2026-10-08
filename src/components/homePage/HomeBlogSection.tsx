"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Article, fetchArticles } from "@/lib/articles";

export function HomeBlogSection() {
  const { locale, t } = useI18n();
  const [posts, setPosts] = useState<Article[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchArticles().then((data) => {
      if (!mounted) return;
      setPosts(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const visiblePosts = useMemo(() => posts.slice(0, 3), [posts]);

  const formatDate = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  if (visiblePosts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("blog_title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "blog_subtitle",
              "Хувцас арчилгаа, сонголтын зөвлөгөө, хүргэлтийн шинэчлэл.",
            )}
          </p>
        </div>
        <Link
          href={`/${locale}/blog`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("view_all")}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {visiblePosts.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-xs text-muted-foreground mb-2">
              {formatDate(post.createdAt)}
            </p>
            <h3 className="font-semibold mb-2">{post.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
            <Link
              href={`/${locale}/blog`}
              className="text-sm font-medium hover:underline"
            >
              {t("blog_read_more", "Read")} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
