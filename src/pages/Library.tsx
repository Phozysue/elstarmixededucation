import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, FileText, Search, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const Library = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>(["all"]);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [readerBook, setReaderBook] = useState<LibraryBook | null>(null);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerIssuedAt, setReaderIssuedAt] = useState<number>(0);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [refreshExhausted, setRefreshExhausted] = useState(false);

  const SIGNED_URL_TTL_SEC = 60 * 60; // 1h
  const MAX_REFRESH_ATTEMPTS = 1;

  const extractPdfPath = (url: string): string => {
    const marker = "/library-pdfs/";
    const idx = url.indexOf(marker);
    return idx >= 0 ? url.substring(idx + marker.length) : url;
  };

  const generateSignedUrl = async (book: LibraryBook) => {
    const path = extractPdfPath(book.pdf_url!);
    const { data, error } = await supabase.storage
      .from("library-pdfs")
      .createSignedUrl(path, SIGNED_URL_TTL_SEC);
    if (error || !data?.signedUrl) throw error || new Error("Failed to generate link");
    return data.signedUrl;
  };

  const handleOpenPdf = async (book: LibraryBook) => {
    if (!book.pdf_url) return;
    setOpeningPdf(true);
    setPdfError(false);
    setRefreshAttempts(0);
    setRefreshExhausted(false);
    try {
      const url = await generateSignedUrl(book);
      setReaderUrl(url);
      setReaderIssuedAt(Date.now());
      setIframeLoading(true);
      setReaderBook(book);
    } catch (e: any) {
      toast.error("Unable to open PDF: " + (e.message || "unknown error"));
      setPdfError(true);
    } finally {
      setOpeningPdf(false);
    }
  };

  const handleRefreshLink = async () => {
    if (!readerBook) return;
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      setRefreshExhausted(true);
      toast.error("Refresh failed twice. Please close this reader and reopen the book.");
      return;
    }
    const nextAttempt = refreshAttempts + 1;
    setRefreshAttempts(nextAttempt);
    try {
      const url = await generateSignedUrl(readerBook);
      setReaderUrl(url);
      setReaderIssuedAt(Date.now());
      setIframeLoading(true);
    } catch (e: any) {
      if (nextAttempt >= MAX_REFRESH_ATTEMPTS) {
        setRefreshExhausted(true);
      }
      toast.error("Could not refresh link: " + (e.message || "unknown error"));
    }
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("library_books")
        .select("*")
        .order("title", { ascending: true });

      if (error) throw error;
      
      setBooks(data || []);
      
      // Extract unique categories
      const uniqueCategories = ["all", ...new Set((data || []).map(book => book.category))];
      setCategories(uniqueCategories);
    } catch (error: any) {
      toast.error("Failed to load library: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();

    const channel = supabase
      .channel("library-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "library_books" }, () => {
        fetchBooks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let filtered = books;

    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter(book => book.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.isbn && book.isbn.toLowerCase().includes(query)) ||
        (book.publisher && book.publisher.toLowerCase().includes(query))
      );
    }

    setFilteredBooks(filtered);
  }, [books, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">School Library</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Explore our collection of books and resources available for students and staff
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="flex flex-wrap justify-center gap-2 h-auto">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Books Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No books found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredBooks.map((book) => (
              <Card
                key={book.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBook(book)}
              >
                <CardContent className="p-3">
                  <div className="aspect-[3/4] relative rounded-md overflow-hidden mb-3 bg-muted">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2" title={book.title}>{book.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={book.available_quantity > 0 ? "default" : "destructive"} className="text-xs">
                      {book.available_quantity > 0 ? `${book.available_quantity} available` : "Unavailable"}
                    </Badge>
                    {book.pdf_url && (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" /> PDF
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Book count */}
        {!loading && filteredBooks.length > 0 && (
          <p className="text-center text-muted-foreground mt-8">
            Showing {filteredBooks.length} of {books.length} books
          </p>
        )}
      </div>

      {/* Book Detail Dialog */}
      <Dialog open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent className="max-w-2xl">
          {selectedBook && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBook.title}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="aspect-[3/4] relative rounded-md overflow-hidden bg-muted">
                  {selectedBook.cover_image_url ? (
                    <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Author</p>
                    <p className="font-medium">{selectedBook.author}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="capitalize">{selectedBook.category}</p>
                    </div>
                    {selectedBook.isbn && (
                      <div>
                        <p className="text-sm text-muted-foreground">ISBN</p>
                        <p>{selectedBook.isbn}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedBook.publisher && (
                      <div>
                        <p className="text-sm text-muted-foreground">Publisher</p>
                        <p>{selectedBook.publisher}</p>
                      </div>
                    )}
                    {selectedBook.published_year && (
                      <div>
                        <p className="text-sm text-muted-foreground">Published Year</p>
                        <p>{selectedBook.published_year}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Availability</p>
                    <Badge variant={selectedBook.available_quantity > 0 ? "default" : "destructive"}>
                      {selectedBook.available_quantity} of {selectedBook.quantity} copies available
                    </Badge>
                  </div>

                  {selectedBook.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{selectedBook.description}</p>
                    </div>
                  )}

                  {selectedBook.pdf_url && (
                    <div className="pt-2 space-y-3">
                      {pdfError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Unable to display this PDF. Please try again later.
                          </AlertDescription>
                        </Alert>
                      )}
                      <Button
                        onClick={() => handleOpenPdf(selectedBook)}
                        className="w-full"
                        disabled={openingPdf}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {openingPdf ? "Opening..." : "Read Book"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* In-app PDF Reader (no download) */}
      <Dialog open={!!readerBook} onOpenChange={(open) => { if (!open) { setReaderBook(null); setReaderUrl(null); setIframeLoading(false); setRefreshAttempts(0); setRefreshExhausted(false); } }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4">
          {readerBook && (
            <>
              <DialogHeader className="flex-row items-center justify-between space-y-0">
                <DialogTitle className="pr-8">{readerBook.title}</DialogTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshLink}
                  className="mr-8"
                  disabled={refreshExhausted}
                  title={refreshExhausted ? "Please reopen the book" : "Refresh secure link"}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {refreshExhausted ? "Reopen needed" : "Refresh"}
                </Button>
              </DialogHeader>
              <div
                className="flex-1 min-h-0 rounded-md overflow-hidden bg-muted relative"
                onContextMenu={(e) => e.preventDefault()}
              >
                {iframeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading book...</p>
                  </div>
                )}
                {readerUrl && (
                  <iframe
                    key={readerIssuedAt}
                    src={`${readerUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    title={readerBook.title}
                    className="w-full h-full border-0"
                    onLoad={() => setIframeLoading(false)}
                    onError={() => setIframeLoading(false)}
                  />
                )}
              </div>
              {refreshExhausted ? (
                <p className="text-xs text-destructive text-center">
                  Could not refresh the secure link. Please close this reader and open the book again.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Reading only — downloading is not permitted. Link expires in 1 hour — click <span className="font-medium">Refresh</span> if it stops loading.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;
