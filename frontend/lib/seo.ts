export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

type BreadcrumbItem = { name: string; url: string }

export function breadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

type FaqEntry = { question: string; answer: string }

export function faqPage(faqs: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}

type HowToStep = { name: string; text: string }

export function howTo(opts: {
  name: string
  description: string
  steps: HowToStep[]
  totalTime?: string
  url?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    ...(opts.totalTime ? { totalTime: opts.totalTime } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

export function blogPosting(opts: {
  title: string
  description: string
  slug: string
  datePublished: string
  dateModified?: string
  image?: string
}) {
  const url = `${APP_URL}/blog/${opts.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified || opts.datePublished,
    inLanguage: 'en-CA',
    image: opts.image || `${APP_URL}/PlekkFeaturedImage.png`,
    author: { '@type': 'Organization', name: 'plekk', url: APP_URL },
    publisher: {
      '@type': 'Organization',
      name: 'plekk',
      url: APP_URL,
      logo: { '@type': 'ImageObject', url: `${APP_URL}/logo.png` },
    },
  }
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
