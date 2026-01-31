import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllBlogPosts } from '@/data/blogPosts'
import { Calendar } from 'lucide-react'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.parkplekk.com'

export const metadata: Metadata = {
  title: 'Blog | Parking Tips, Driveway Rental & More',
  description: 'Tips for finding parking, listing your driveway, and making the most of hourly parking and the parking marketplace. Read the plekk blog.',
  openGraph: {
    title: 'Blog | plekk - Parking & Driveway Rental Tips',
    description: 'Tips for finding parking, listing your driveway, and hourly parking. Read the plekk blog.',
    url: `${baseUrl}/blog`,
  },
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            plekk Blog
          </h1>
          <p className="text-lg text-gray-600">
            Parking tips, driveway rental advice, and how to find or list a parking space near you.
          </p>
        </header>

        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.slug} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <Link href={`/blog/${post.slug}`} className="block p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 hover:text-accent-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {post.description}
                </p>
                <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.date).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
