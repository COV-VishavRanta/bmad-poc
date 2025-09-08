import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// Mock post data - replace with actual data later
const mockPosts = [
  {
    id: 1,
    title: "Introduction to Next.js 15",
    description: "Learn about the latest features in Next.js 15 and how to get started.",
    publishedDate: "2024-01-15",
    slug: "introduction-nextjs-15",
    author: "John Doe"
  },
  {
    id: 2,
    title: "Building Modern React Applications",
    description: "Best practices for building scalable React applications in 2024.",
    publishedDate: "2024-01-10",
    slug: "building-modern-react-apps",
    author: "Jane Smith"
  },
  {
    id: 3,
    title: "TypeScript Tips and Tricks",
    description: "Advanced TypeScript patterns and techniques for better code.",
    publishedDate: "2024-01-05",
    slug: "typescript-tips-tricks",
    author: "Bob Wilson"
  },
];

export default function Posts() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">All Posts</h1>
          <p className="text-muted-foreground">
            Browse our latest blog posts and articles
          </p>
        </div>

        <div className="grid gap-6">
          {mockPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="mb-2">
                      <Link 
                        href={`/posts/${post.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mb-4">
                      {post.description}
                    </CardDescription>
                    <div className="text-sm text-muted-foreground">
                      By {post.author} • {post.publishedDate}
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/posts/${post.slug}`}>
                      Read More
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {mockPosts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CardDescription className="mb-4">
                No posts published yet. Check back later!
              </CardDescription>
              <Button asChild>
                <Link href="/create">Write First Post</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
