import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  Save,
  X,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgePage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["knowledge", wsId, searchQuery],
    queryFn: () => {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
      return apiGet<KnowledgeEntry[]>(`/api/workspaces/${wsId}/knowledge${params}`);
    },
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost(`/api/workspaces/${wsId}/knowledge`, {
        title: newTitle,
        content: newContent,
        category: newCategory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", wsId] });
      setCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewCategory("general");
      toast({ title: "Knowledge entry created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      apiPut(`/api/workspaces/${wsId}/knowledge/${id}`, {
        title: editTitle,
        content: editContent,
        category: editCategory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", wsId] });
      setEditingId(null);
      toast({ title: "Knowledge entry updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/workspaces/${wsId}/knowledge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", wsId] });
      toast({ title: "Knowledge entry deleted" });
    },
  });

  const entryList = Array.isArray(entries) ? entries : [];
  const categories = [...new Set(entryList.map((e) => e.category))];

  function startEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setEditCategory(entry.category);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Store information that AI staff reference during delegations
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Knowledge Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Company Brand Guidelines"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., marketing, product, operations"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter the knowledge content here..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newTitle.trim() || !newContent.trim()}
              >
                {createMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Category badges */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => setSearchQuery(cat)}
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {cat} ({entryList.filter((e) => e.category === cat).length})
            </Badge>
          ))}
        </div>
      )}

      {/* Entry List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : entryList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {searchQuery ? "No results found" : "No Knowledge Entries Yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Add company info, guidelines, processes, and data that your AI staff can reference during delegations.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entryList.map((entry) => {
            const isEditing = editingId === entry.id;
            const isExpanded = expandedId === entry.id;

            return (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <Input
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="Category"
                      />
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate(entry.id)}
                          disabled={updateMutation.isPending}
                          className="gap-1"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                            <Badge variant="secondary" className="text-[10px]">{entry.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Updated {new Date(entry.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => startEdit(entry)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                            onClick={() => {
                              if (window.confirm(`Delete "${entry.title}"?`)) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p
                        className="text-xs text-muted-foreground mt-2 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded
                          ? entry.content
                          : entry.content.length > 150
                            ? entry.content.slice(0, 150) + "..."
                            : entry.content}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
