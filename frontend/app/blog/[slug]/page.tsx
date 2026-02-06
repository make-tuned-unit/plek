import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogPostBySlug, getAllBlogSlugs } from '@/data/blogPosts'
import { ArrowLeft, Calendar } from 'lucide-react'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) return { title: 'Post not found' }
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${baseUrl}/blog/${slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-mist-100">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-4">
            {post.title}
          </h1>
          <time
            dateTime={post.date}
            className="inline-flex items-center gap-2 text-sm text-charcoal-500"
          >
            <Calendar className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>

        <div className="prose prose-gray max-w-none">
          {post.sections.map((section, i) =>
            section.type === 'h2' ? (
              <h2 key={i} className="text-xl font-semibold text-charcoal-900 mt-8 mb-4">
                {section.content}
              </h2>
            ) : (
              <p key={i} className="text-charcoal-600 leading-relaxed mb-4">
                {section.content}
              </p>
            )
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-200">
          <Link
            href="/find-parking"
            className="inline-block px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
          >
            Find parking near you
          </Link>
          <span className="mx-3 text-charcoal-400">|</span>
          <Link
            href="/list-your-driveway"
            className="inline-block px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            List your driveway
          </Link>
        </div>
      </article>
    </div>
  )
}
