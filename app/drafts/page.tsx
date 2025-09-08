import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// Mock draft data - replace with actual data later
const mockDrafts = [
  {
    id: 1,
    title: "Getting Started with Next.js",
    lastModified: "2024-01-15",
    slug: "getting-started-nextjs"
  },
  {
    id: 2,
    title: "Understanding React Hooks",
    lastModified: "2024-01-14",
    slug: "understanding-react-hooks"
  },
];

export default function Drafts() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Draft Posts</h1>
          <p className="text-muted-foreground">
            Manage your unpublished blog posts
          </p>
        </div>

        {mockDrafts.length > 0 ? (
          <div className="grid gap-4">
            {mockDrafts.map((draft) => (
              <Card key={draft.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{draft.title}</CardTitle>
                      <CardDescription>
                        Last modified: {draft.lastModified}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button size="sm">
                        Publish
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <CardDescription className="mb-4">
                No drafts found. Start writing your first post!
              </CardDescription>
              <Button asChild>
                <Link href="/create">Create New Post</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
