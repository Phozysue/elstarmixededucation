import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { BookOpen, FileText, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  description: string | null;
  cover_image_url: string | null;
  pdf_url: string | null;
  quantity: number;
  available_quantity: number;
  published_year: number | null;
  publisher: string | null;
}

const LibraryManagement = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const editPdfInputRef = useRef<HTMLInputElement>(null);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("library_books")
        .select("*")
        .order("title", { ascending: true });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch books: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();

    const channel = supabase
      .channel("library-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "library_books" }, () => {
        fetchBooks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please select a valid image (JPEG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setSelectedFile(file);
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF must be less than 50MB");
      return;
    }

    setSelectedPdf(file);
  };

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: formData,
    });

    if (error) throw new Error(error.message || "Upload failed");
    if (!data?.publicUrl) throw new Error("Failed to get upload URL");

    return data.publicUrl;
  };

  const handleSave = async (formData: FormData) => {
    const title = (formData.get("title") as string || "").trim();
    const author = (formData.get("author") as string || "").trim();
    const isbn = (formData.get("isbn") as string || "").trim() || null;
    const category = (formData.get("category") as string || "").trim();
    const description = (formData.get("description") as string || "").trim() || null;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const available_quantity = parseInt(formData.get("available_quantity") as string) || quantity;
    const published_year = parseInt(formData.get("published_year") as string) || null;
    const publisher = (formData.get("publisher") as string || "").trim() || null;

    if (!title || title.length > 200) {
      toast.error("Title is required and must be under 200 characters");
      return;
    }

    if (!author || author.length > 100) {
      toast.error("Author is required and must be under 100 characters");
      return;
    }

    if (!category || category.length > 50) {
      toast.error("Category is required and must be under 50 characters");
      return;
    }

    if (available_quantity > quantity) {
      toast.error("Available quantity cannot exceed total quantity");
      return;
    }

    setUploading(true);

    try {
      let cover_image_url = editingBook?.cover_image_url || null;
      let pdf_url = editingBook?.pdf_url || null;

      if (selectedFile) {
        cover_image_url = await uploadFile(selectedFile, "book-covers");
      }

      if (selectedPdf) {
        pdf_url = await uploadFile(selectedPdf, "library-pdfs");
      }

      const bookData = {
        title,
        author,
        isbn,
        category,
        description,
        cover_image_url,
        pdf_url,
        quantity,
        available_quantity,
        published_year,
        publisher,
      };

      if (editingBook) {
        const { error } = await supabase
          .from("library_books")
          .update(bookData)
          .eq("id", editingBook.id);
        if (error) throw error;
        logAudit({
          action: "library_book.updated",
          entity_type: "library_book",
          entity_id: editingBook.id,
          metadata: { title, has_new_pdf: !!selectedPdf, has_new_cover: !!selectedFile },
        });
        toast.success("Book updated successfully");
      } else {
        const { data: inserted, error } = await supabase
          .from("library_books")
          .insert({ ...bookData, created_by: user?.id! })
          .select("id")
          .single();
        if (error) throw error;
        logAudit({
          action: "library_book.created",
          entity_type: "library_book",
          entity_id: inserted?.id ?? null,
          metadata: { title, has_pdf: !!selectedPdf },
        });
        toast.success("Book added successfully");
      }

      setIsDialogOpen(false);
      setEditingBook(null);
      setSelectedFile(null);
      setSelectedPdf(null);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      const { error } = await supabase.from("library_books").delete().eq("id", id);
      if (error) throw error;
      logAudit({ action: "library_book.deleted", entity_type: "library_book", entity_id: id });
      toast.success("Book deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setSelectedPdf(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (editPdfInputRef.current) editPdfInputRef.current.value = "";
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const BookForm = ({ book }: { book?: LibraryBook }) => (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Title *</Label>
          <Input name="title" defaultValue={book?.title || ""} required maxLength={200} />
        </div>
        <div>
          <Label>Author *</Label>
          <Input name="author" defaultValue={book?.author || ""} required maxLength={100} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>ISBN</Label>
          <Input name="isbn" defaultValue={book?.isbn || ""} maxLength={20} />
        </div>
        <div>
          <Label>Category *</Label>
          <Input name="category" defaultValue={book?.category || "general"} required maxLength={50} />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea name="description" defaultValue={book?.description || ""} maxLength={1000} rows={3} />
      </div>

      <div>
        <Label>{book ? "Replace Cover Image" : "Cover Image"}</Label>
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (book ? editFileInputRef : fileInputRef).current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {selectedFile ? selectedFile.name : "Choose Image"}
          </Button>
          <input
            ref={book ? editFileInputRef : fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Supported: JPEG, PNG, GIF, WebP (up to 5MB)
          </p>
          {book && <p className="text-xs text-muted-foreground mt-1">Leave empty to keep current cover</p>}
        </div>
      </div>

      <div>
        <Label>{book ? "Replace PDF" : "PDF File"}</Label>
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (book ? editPdfInputRef : pdfInputRef).current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            {selectedPdf ? selectedPdf.name : "Choose PDF"}
          </Button>
          <input
            ref={book ? editPdfInputRef : pdfInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfSelect}
            className="hidden"
          />
          {book?.pdf_url && <p className="text-xs text-muted-foreground mt-1">Current PDF uploaded. Leave empty to keep it.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Total Quantity *</Label>
          <Input name="quantity" type="number" defaultValue={book?.quantity || 1} min={0} required />
        </div>
        <div>
          <Label>Available Quantity *</Label>
          <Input name="available_quantity" type="number" defaultValue={book?.available_quantity || 1} min={0} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Published Year</Label>
          <Input name="published_year" type="number" defaultValue={book?.published_year || ""} min={1000} max={new Date().getFullYear()} />
        </div>
        <div>
          <Label>Publisher</Label>
          <Input name="publisher" defaultValue={book?.publisher || ""} maxLength={100} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {book ? "Saving..." : "Adding..."}
          </>
        ) : (
          book ? "Save Changes" : "Add Book"
        )}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Library Management</CardTitle>
        <Dialog open={isDialogOpen && !editingBook} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingBook(null); resetDialog(); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingBook(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Book</DialogTitle>
            </DialogHeader>
            <BookForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No books in the library yet. Add your first book!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {books.map((book) => (
              <Card key={book.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="aspect-[3/4] relative rounded-md overflow-hidden mb-3 bg-muted">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold line-clamp-2" title={book.title}>{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  <p className="text-xs text-muted-foreground mt-1">{book.category}</p>
                  <p className="text-xs mt-2">
                    <span className={book.available_quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {book.available_quantity} / {book.quantity} available
                    </span>
                  </p>
                  {book.pdf_url && (
                    <p className="text-xs mt-1 text-primary flex items-center gap-1">
                      <FileText className="h-3 w-3" /> PDF available
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Dialog open={isDialogOpen && editingBook?.id === book.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingBook(null); resetDialog(); } }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditingBook(book)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Book</DialogTitle>
                        </DialogHeader>
                        <BookForm book={book} />
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(book.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LibraryManagement;
