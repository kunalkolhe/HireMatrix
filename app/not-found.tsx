import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D1225] flex flex-col items-center justify-center text-center p-4">
      <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
        <Search className="w-8 h-8" />
      </div>
      <h1 className="text-6xl font-extrabold text-white tracking-tight mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
      <p className="text-white/60 mb-8 max-w-md">
        We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps you mistyped the URL.
      </p>
      <Link href="/">
        <Button className="btn-primary">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  )
}
