const LoadingScreen = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

export default LoadingScreen;
