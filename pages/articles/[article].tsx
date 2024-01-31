import { extractMetaTags } from '@ircsignpost/signpost-base/dist/src/article-content';
import {
  ArticlePageStrings,
  getErrorResponseProps,
} from '@ircsignpost/signpost-base/dist/src/article-page';
import ArticlePage, {
  MountArticle,
} from '@ircsignpost/signpost-base/dist/src/article-page';
import CookieBanner from '@ircsignpost/signpost-base/dist/src/cookie-banner';
import Footer from '@ircsignpost/signpost-base/dist/src/footer';
import { MenuOverlayItem } from '@ircsignpost/signpost-base/dist/src/menu-overlay';
import { createDefaultSearchBarProps } from '@ircsignpost/signpost-base/dist/src/search-bar';
import {
  CategoryWithSections,
  ZendeskCategory,
  getCategoriesWithSections,
} from '@ircsignpost/signpost-base/dist/src/zendesk';
import {
  getArticle,
  getArticles,
  getCategories,
  getTranslationsFromDynamicContent,
} from '@ircsignpost/signpost-base/dist/src/zendesk';
import { GetStaticProps } from 'next';
import getConfig from 'next/config';
import { useRouter } from 'next/router';
import React from 'react';

import { useBreadcrumbs } from '../../context/BreadcrumbsContext';
import {
  MENU_CATEGORIES_TO_HIDE,
  ABOUT_US_ARTICLE_ID,
  CATEGORIES_TO_HIDE,
  CATEGORY_ICON_NAMES,
  GOOGLE_ANALYTICS_IDS,
  REVALIDATION_TIMEOUT_SECONDS,
  SEARCH_BAR_INDEX,
  SECTION_ICON_NAMES,
import {
} from '../../lib/constants';
import {
  LOCALES,
  LOCALE_CODES_TO_CANONICAL_LOCALE_CODES,
  Locale,
  getLocaleFromCode,
  getZendeskLocaleId,
import { getHeaderLogoProps } from '../../lib/logo';
import { getFooterItems, getMenuItems } from '../../lib/menu';
import {
  COMMON_DYNAMIC_CONTENT_PLACEHOLDERS,
  ERROR_DYNAMIC_CONTENT_PLACEHOLDERS,
  generateArticleErrorProps,
  populateArticlePageStrings,
  populateMenuOverlayStrings,
} from '../../lib/translations';
import { getSiteUrl, getZendeskMappedUrl, getZendeskUrl } from '../../lib/url';

interface ArticleProps {
  pageTitle: string;
  articleTitle: string;
  articleContent: string;
  metaTagAttributes: object[];
  siteUrl: string;
  articleId: number;
  lastEditedValue: string;
  locale: Locale;
  pageUnderConstruction?: boolean;
  preview: boolean;
  strings: ArticlePageStrings;
  // A list of |MenuOverlayItem|s to be displayed in the header and side menu.
  menuOverlayItems: MenuOverlayItem[];
  footerLinks?: MenuOverlayItem[];
}

export default function Article({
  pageTitle,
  articleTitle,
  articleId,
  articleContent,
  metaTagAttributes,
  siteUrl,
  lastEditedValue,
  locale,
  pageUnderConstruction,
  preview,
  strings,
  menuOverlayItems,
  footerLinks,
}: ArticleProps) {
  const router = useRouter();
  const { publicRuntimeConfig } = getConfig();
  const { breadcrumbs } = useBreadcrumbs();

  return (
    <ArticlePage
      pageTitle={pageTitle}
      articleId={articleId}
      canonicalLocales={LOCALE_CODES_TO_CANONICAL_LOCALE_CODES}
      pageUnderConstruction={pageUnderConstruction}
      siteUrl={siteUrl}
      preview={preview}
      errorProps={strings.articleErrorStrings}
      metaTagAttributes={metaTagAttributes}
      layoutWithMenuProps={{
        headerProps: {
          currentLocale: locale,
          locales: LOCALES,
          logoProps: getHeaderLogoProps(locale),
          searchBarProps: createDefaultSearchBarProps(
            strings.searchBarStrings,
            SEARCH_BAR_INDEX,
            locale,
            router
          ),
        },
        menuOverlayItems: menuOverlayItems,
        cookieBanner: (
          <CookieBanner
            strings={strings.cookieBannerStrings}
            googleAnalyticsIds={GOOGLE_ANALYTICS_IDS}
          />
        ),
        footerComponent: (
          <Footer
            currentLocale={locale}
            locales={LOCALES}
            strings={strings.footerStrings}
            links={footerLinks}
            signpostVersion={publicRuntimeConfig?.version}
          />
        ),
        layoutDirection: locale.direction,
        children: [],
      }}
    >
      <MountArticle
        articleProps={{
          title: articleTitle,
          content: articleContent,
          lastEdit: {
            label: strings.lastUpdatedLabel,
            value: lastEditedValue,
            locale: locale,
          },
          strings: strings.articleContentStrings,
          previosURL: breadcrumbs,
        }}
      />
    </ArticlePage>
  );
}

async function getStaticParams() {
  const articles = await Promise.all(
    Object.values(LOCALES).map(
      async (locale) => await getArticles(locale, getZendeskUrl())
    )
  );

  return articles.flat().map((article) => {
    return {
      article: article.id.toString(),
      locale: article.locale,
    };
  });
}
export async function getStaticPaths() {
  const articleParams = await getStaticParams();

  return {
    paths: articleParams.map(({ article, locale }) => {
      return {
        params: { article },
        locale,
      };
    }),
    fallback: 'blocking',
  };
}

function getStringPath(article: string, locale: string): string {
  return `/${locale}/articles/${article}`;
}

export async function getStringPaths(): Promise<string[]> {
  const params = await getStaticParams();
  return params.map((param) => getStringPath(param.article, param.locale));
}

export const getStaticProps: GetStaticProps = async ({
  params,
  locale,
  preview,
}) => {
  const currentLocale = getLocaleFromCode(locale ?? '');
  let dynamicContent = await getTranslationsFromDynamicContent(
    getZendeskLocaleId(currentLocale),
    [
      ...COMMON_DYNAMIC_CONTENT_PLACEHOLDERS,
      ...ERROR_DYNAMIC_CONTENT_PLACEHOLDERS,
    ],
    getZendeskUrl(),
    ZENDESK_AUTH_HEADER
  );

  let categories: ZendeskCategory[] | CategoryWithSections[];
  let menuCategories: ZendeskCategory[] | CategoryWithSections[];
  if (USE_CAT_SEC_ART_CONTENT_STRUCTURE) {
    categories = await getCategoriesWithSections(
      currentLocale,
      getZendeskUrl(),
      (c) => !CATEGORIES_TO_HIDE.includes(c.id)
