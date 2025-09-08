import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

// Mock post data - replace with actual data later
const mockPosts = [
  {
    id: 1,
    title: "Introduction to Next.js 15",
    content: `
# Introduction to Next.js 15

Next.js 15 introduces several exciting features that make building React applications even more powerful and efficient.

## What's New?

- **Turbopack**: Faster builds and hot reloads
- **App Router Enhancements**: Better routing capabilities
- **Improved TypeScript Support**: Better type inference and checking

## Getting Started

To get started with Next.js 15, you can create a new project using:

\`\`\`bash
npx create-next-app@latest my-app
\`\`\`

This will set up a new Next.js project with all the latest features enabled.

## Conclusion

Next.js 15 continues to push the boundaries of what's possible with React development.
    `,
    publishedDate: "2024-01-15",
    slug: "introduction-nextjs-15",
    author: "John Doe"
  },
  {
    id: 2,
    title: "Building Modern React Applications",
    content: `
# Building Modern React Applications

In 2024, React development has evolved significantly. Here are the best practices for building scalable applications.

## Key Principles

1. **Component Composition**: Build reusable, composable components
2. **State Management**: Use appropriate state management solutions
3. **Performance**: Optimize for speed and user experience

## Modern Tools

- **TypeScript**: For better type safety
- **Next.js**: For full-stack React applications
- **Tailwind CSS**: For efficient styling

## Conclusion

Following these practices will help you build maintainable and scalable React applications.
    `,
    publishedDate: "2024-01-10",
    slug: "building-modern-react-apps",
    author: "Jane Smith"
  },
  {
    id: 3,
    title: "TypeScript Tips and Tricks",
    content: `
# TypeScript Tips and Tricks

Advanced TypeScript patterns that will improve your code quality and developer experience.

## Advanced Types

- **Union Types**: Combine multiple types
- **Intersection Types**: Merge type properties
- **Generic Constraints**: Limit generic type parameters

## Utility Types

TypeScript provides many built-in utility types:
- \`Partial<T>\`: Makes all properties optional
- \`Required<T>\`: Makes all properties required
- \`Pick<T, K>\`: Picks specific properties

## Conclusion

Master these patterns to write more robust TypeScript code.
    `,
    publishedDate: "2024-01-05",
    slug: "typescript-tips-tricks",
    author: "Bob Wilson"
  },
];

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = mockPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button asChild variant="outline" className="mb-4">
              <Link href="/posts">← Back to Posts</Link>
            </Button>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl mb-4">{post.title}</CardTitle>
                <div className="text-muted-foreground">
                  By {post.author} • {post.publishedDate}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">
                    {post.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Generate static params for static generation (optional)
export async function generateStaticParams() {
  return mockPosts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = mockPosts.find((p) => p.slug === slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: `Blog post by ${post.author}`,
  };
}
